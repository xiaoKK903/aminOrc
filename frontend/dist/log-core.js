const LogCore = (function() {
  'use strict';

  const SEARCH_PATTERNS = {
    level: /level:(\w+)/gi,
    service: /service:([\w-]+)/gi,
    trace: /trace:([\w-]+)/gi,
    span: /span:([\w-]+)/gi,
    duration: /duration:([<>]=?)(\d+)/gi,
    text: /"([^"]+)"/g,
    date: /date:(\d{4}-\d{2}-\d{2})/gi,
    time: /time:(\d{2}:\d{2}:\d{2})/gi
  };

  function parseQuery(query) {
    const result = {
      levels: [],
      services: [],
      traceIds: [],
      spanIds: [],
      keywords: [],
      durationGt: null,
      durationLt: null,
      date: null,
      time: null,
      raw: query
    };

    let remaining = query;

    const levelMatch = SEARCH_PATTERNS.level;
    let match;
    while ((match = levelMatch.exec(query)) !== null) {
      result.levels.push(match[1].toUpperCase());
      remaining = remaining.replace(match[0], '');
    }

    const serviceMatch = SEARCH_PATTERNS.service;
    while ((match = serviceMatch.exec(query)) !== null) {
      result.services.push(match[1]);
      remaining = remaining.replace(match[0], '');
    }

    const traceMatch = SEARCH_PATTERNS.trace;
    while ((match = traceMatch.exec(query)) !== null) {
      result.traceIds.push(match[1]);
      remaining = remaining.replace(match[0], '');
    }

    const spanMatch = SEARCH_PATTERNS.span;
    while ((match = spanMatch.exec(query)) !== null) {
      result.spanIds.push(match[1]);
      remaining = remaining.replace(match[0], '');
    }

    const durationMatch = SEARCH_PATTERNS.duration;
    while ((match = durationMatch.exec(query)) !== null) {
      const op = match[1];
      const val = parseInt(match[2]);
      if (op === '>' || op === '>=') {
        result.durationGt = op === '>=' ? val : val + 1;
      } else if (op === '<' || op === '<=') {
        result.durationLt = op === '<=' ? val : val - 1;
      }
      remaining = remaining.replace(match[0], '');
    }

    const dateMatch = SEARCH_PATTERNS.date;
    while ((match = dateMatch.exec(query)) !== null) {
      result.date = match[1];
      remaining = remaining.replace(match[0], '');
    }

    const timeMatch = SEARCH_PATTERNS.time;
    while ((match = timeMatch.exec(query)) !== null) {
      result.time = match[1];
      remaining = remaining.replace(match[0], '');
    }

    const textMatch = SEARCH_PATTERNS.text;
    while ((match = textMatch.exec(query)) !== null) {
      result.keywords.push(match[1]);
      remaining = remaining.replace(match[0], '');
    }

    const plainKeywords = remaining.trim().split(/\s+/).filter(k => k && !k.includes(':'));
    result.keywords = [...result.keywords, ...plainKeywords];

    return result;
  }

  function filterLogs(logs, query) {
    if (!query) return logs;
    if (!query.raw && !query.keywords?.length) return logs;

    return logs.filter(log => {
      if (query.levels?.length) {
        if (!query.levels.includes(log.level)) return false;
      }

      if (query.services?.length) {
        if (!query.services.includes(log.service)) return false;
      }

      if (query.traceIds?.length) {
        if (!query.traceIds.some(tid => log.traceId?.includes(tid))) return false;
      }

      if (query.spanIds?.length) {
        if (!query.spanIds.some(sid => log.spanId?.includes(sid))) return false;
      }

      if (query.keywords?.length) {
        const searchText = (log.message + ' ' + (log.stack || '') + ' ' + JSON.stringify(log.context || {})).toLowerCase();
        for (const kw of query.keywords) {
          if (!searchText.includes(kw.toLowerCase())) return false;
        }
      }

      return true;
    });
  }

  function highlightText(text, keywords) {
    if (!keywords || !keywords.length) return text;
    
    let result = text;
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    
    for (const kw of sortedKeywords) {
      const regex = new RegExp(escapeRegExp(kw), 'gi');
      result = result.replace(regex, match => `<mark>${match}</mark>`);
    }
    
    return result;
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  class VirtualScrollManager {
    constructor(options = {}) {
      this.container = options.container || null;
      this.itemHeight = options.itemHeight || 40;
      this.bufferSize = options.bufferSize || 10;
      this.items = [];
      this.visibleItems = [];
      this.scrollTop = 0;
      this.containerHeight = 0;
      
      this._onScroll = this._onScroll.bind(this);
    }

    init(container) {
      this.container = container;
      this.container.addEventListener('scroll', this._onScroll);
      this.updateContainerHeight();
    }

    destroy() {
      if (this.container) {
        this.container.removeEventListener('scroll', this._onScroll);
      }
    }

    setItems(items) {
      this.items = items;
      this._updateVisibleItems();
    }

    updateContainerHeight() {
      if (this.container) {
        this.containerHeight = this.container.clientHeight;
        this._updateVisibleItems();
      }
    }

    _onScroll(event) {
      this.scrollTop = event.target.scrollTop;
      this._updateVisibleItems();
    }

    _updateVisibleItems() {
      if (!this.items.length || !this.containerHeight) {
        this.visibleItems = [];
        return;
      }

      const totalHeight = this.items.length * this.itemHeight;
      
      const startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize);
      const endIndex = Math.min(
        this.items.length,
        Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight) + this.bufferSize
      );

      this.visibleItems = this.items.slice(startIndex, endIndex).map((item, idx) => ({
        ...item,
        _index: startIndex + idx,
        _offsetY: (startIndex + idx) * this.itemHeight
      }));

      this.totalHeight = totalHeight;
      this.startOffset = startIndex * this.itemHeight;
    }

    getVisibleItems() {
      return this.visibleItems;
    }
  }

  class LogPersistence {
    constructor(options = {}) {
      this.dbName = options.dbName || 'log-monitor';
      this.dbVersion = options.dbVersion || 1;
      this.maxLogs = options.maxLogs || 100000;
      this.db = null;
    }

    async init() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          if (!db.objectStoreNames.contains('logs')) {
            const logStore = db.createObjectStore('logs', { keyPath: 'id' });
            logStore.createIndex('timestamp', 'timestamp');
            logStore.createIndex('level', 'level');
            logStore.createIndex('service', 'service');
            logStore.createIndex('traceId', 'traceId');
          }
          
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        };
      });
    }

    async addLog(log) {
      if (!this.db) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        
        const request = store.add(log);
        
        request.onsuccess = () => resolve(log);
        request.onerror = () => reject(request.error);
        
        transaction.oncomplete = async () => {
          const count = await this.getLogCount();
          if (count > this.maxLogs) {
            await this.cleanOldLogs(Math.floor(this.maxLogs * 0.1));
          }
        };
      });
    }

    async addLogs(logs) {
      if (!this.db) await this.init();
      
      const promises = logs.slice(0, 1000).map(log => this.addLog(log));
      return Promise.all(promises);
    }

    async getLogs(options = {}) {
      if (!this.db) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        const index = store.index('timestamp');
        
        const request = index.openCursor(null, 'prev');
        const logs = [];
        const limit = options.limit || 1000;
        const offset = options.offset || 0;
        let count = 0;
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && logs.length < limit) {
            if (count >= offset) {
              logs.push(cursor.value);
            }
            count++;
            cursor.continue();
          } else {
            resolve(logs);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    }

    async getLogCount() {
      if (!this.db) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        const request = store.count();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async cleanOldLogs(count) {
      if (!this.db) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        const index = store.index('timestamp');
        
        const request = index.openCursor();
        let deleted = 0;
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && deleted < count) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            resolve(deleted);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    }

    async clearAll() {
      if (!this.db) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async saveSetting(key, value) {
      if (!this.db) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        const request = store.put({ key, value, updatedAt: Date.now() });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async getSetting(key) {
      if (!this.db) await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
      });
    }
  }

  class LogStreamSimulator {
    constructor(options = {}) {
      this.rate = options.rate || 10;
      this.isRunning = false;
      this.intervalId = null;
      this.listeners = [];
      this.services = options.services || [
        'user-service',
        'order-service',
        'payment-service',
        'gateway-service'
      ];
    }

    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }

    start() {
      if (this.isRunning) return;
      
      this.isRunning = true;
      this._emit();
      this.intervalId = setInterval(() => this._emit(), 1000 / this.rate);
    }

    stop() {
      this.isRunning = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }

    setRate(rate) {
      this.rate = rate;
      if (this.isRunning) {
        this.stop();
        this.start();
      }
    }

    _emit() {
      const log = this._generateLog();
      this.listeners.forEach(listener => listener(log));
    }

    _generateLog() {
      const levels = ['INFO', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR', 'DEBUG'];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const service = this.services[Math.floor(Math.random() * this.services.length)];
      
      const messages = {
        INFO: [
          'Request completed: GET /api/users, status=200, duration=45ms',
          'User login successful: user_id=' + Math.floor(Math.random() * 10000),
          'Cache hit: key=user:' + Math.floor(Math.random() * 1000),
          'Health check passed: status=UP'
        ],
        WARN: [
          'Slow query detected: execution took ' + Math.floor(Math.random() * 3000) + 'ms',
          'High memory usage: ' + Math.floor(Math.random() * 30 + 70) + '%',
          'Retry attempt ' + Math.floor(Math.random() * 3 + 1) + '/3 for ' + service
        ],
        ERROR: [
          'NullPointerException: Cannot read property \'id\' of null',
          'DatabaseConnectionException: Connection timed out',
          'CircuitBreakerOpenException: Circuit breaker is OPEN'
        ],
        DEBUG: [
          'Entering method: ' + service + '.processRequest',
          'Query parameters: { page: ' + Math.floor(Math.random() * 10) + ', size: 20 }',
          'Request headers: { Authorization: \'Bearer xxx\' }'
        ]
      };

      return {
        id: 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        level,
        service,
        traceId: 'trace-' + Math.random().toString(36).substr(2, 16),
        spanId: 'span-' + Math.random().toString(36).substr(2, 8),
        message: messages[level][Math.floor(Math.random() * messages[level].length)],
        context: {
          user_id: Math.floor(Math.random() * 10000),
          request_id: 'req-' + Math.random().toString(36).substr(2, 12),
          duration_ms: Math.floor(Math.random() * 500)
        }
      };
    }
  }

  class AlertEngine {
    constructor(options = {}) {
      this.rules = [];
      this.isRunning = false;
      this.checkInterval = options.checkInterval || 60000;
      this.listeners = [];
      this.logWindow = [];
      this.maxWindowSize = options.maxWindowSize || 10000;
      this.intervalId = null;
    }

    addRule(rule) {
      this.rules.push({
        id: rule.id || 'rule-' + Date.now(),
        name: rule.name,
        description: rule.description,
        severity: rule.severity || 'warning',
        condition: rule.condition,
        enabled: rule.enabled !== false,
        lastFired: null,
        cooldown: rule.cooldown || 300000
      });
    }

    removeRule(ruleId) {
      this.rules = this.rules.filter(r => r.id !== ruleId);
    }

    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }

    addLog(log) {
      this.logWindow.push(log);
      if (this.logWindow.length > this.maxWindowSize) {
        this.logWindow.shift();
      }
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this._check();
      this.intervalId = setInterval(() => this._check(), this.checkInterval);
    }

    stop() {
      this.isRunning = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }

    _check() {
      const now = Date.now();
      
      for (const rule of this.rules) {
        if (!rule.enabled) continue;
        
        if (rule.lastFired && now - rule.lastFired < rule.cooldown) continue;
        
        const result = this._evaluateRule(rule);
        if (result) {
          rule.lastFired = now;
          this._fireAlert(rule, result);
        }
      }
    }

    _evaluateRule(rule) {
      const windowMs = 5 * 60 * 1000;
      const windowStart = Date.now() - windowMs;
      const windowLogs = this.logWindow.filter(l => l.timestamp >= windowStart);
      
      if (rule.condition.type === 'error_rate') {
        const total = windowLogs.length;
        const errors = windowLogs.filter(l => l.level === 'ERROR').length;
        const rate = total > 0 ? errors / total : 0;
        return rate > (rule.condition.threshold || 0.05) ? { rate, total, errors } : null;
      }
      
      if (rule.condition.type === 'response_time') {
        const p99 = this._calculatePercentile(windowLogs, 99);
        return p99 > (rule.condition.threshold || 1000) ? { p99 } : null;
      }
      
      if (rule.condition.type === 'service_down') {
        const services = rule.condition.services || [];
        for (const service of services) {
          const serviceLogs = windowLogs.filter(l => l.service === service);
          if (serviceLogs.length === 0) {
            return { service, lastSeen: 'N/A' };
          }
        }
        return null;
      }
      
      return null;
    }

    _calculatePercentile(logs, percentile) {
      const durations = logs
        .filter(l => l.context?.duration_ms)
        .map(l => l.context.duration_ms)
        .sort((a, b) => a - b);
      
      if (durations.length === 0) return 0;
      
      const index = Math.ceil(durations.length * percentile / 100) - 1;
      return durations[Math.max(0, index)];
    }

    _fireAlert(rule, data) {
      const alert = {
        id: 'alert-' + Date.now(),
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        timestamp: Date.now(),
        description: rule.description,
        data
      };
      
      this.listeners.forEach(listener => listener(alert));
    }

    getRules() {
      return [...this.rules];
    }
  }

  return {
    parseQuery,
    filterLogs,
    highlightText,
    escapeRegExp,
    VirtualScrollManager,
    LogPersistence,
    LogStreamSimulator,
    AlertEngine,
    
    SEARCH_PATTERNS
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LogCore;
}