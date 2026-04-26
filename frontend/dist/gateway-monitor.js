const GatewayMonitor = (function() {
  'use strict';

  class RateLimiter {
    constructor(options = {}) {
      this.maxQps = options.maxQps || 100;
      this.strategy = options.strategy || 'reject';
      this.requests = [];
      this.windowSize = 1000;
    }

    tryAcquire() {
      const now = Date.now();
      const windowStart = now - this.windowSize;
      
      this.requests = this.requests.filter(t => t > windowStart);
      
      if (this.requests.length < this.maxQps) {
        this.requests.push(now);
        return { allowed: true };
      }
      
      if (this.strategy === 'wait') {
        const oldestRequest = this.requests[0];
        const waitTime = this.windowSize - (now - oldestRequest);
        return {
          allowed: false,
          strategy: 'wait',
          waitTime
        };
      }
      
      return {
        allowed: false,
        strategy: 'reject',
        reason: 'QPS limit exceeded'
      };
    }

    reset() {
      this.requests = [];
    }

    updateConfig(options) {
      if (options.maxQps !== undefined) {
        this.maxQps = options.maxQps;
      }
      if (options.strategy !== undefined) {
        this.strategy = options.strategy;
      }
    }

    getStats() {
      const now = Date.now();
      const windowStart = now - this.windowSize;
      const currentRequests = this.requests.filter(t => t > windowStart);
      
      return {
        currentQps: currentRequests.length,
        maxQps: this.maxQps,
        strategy: this.strategy,
        remaining: this.maxQps - currentRequests.length,
        windowSize: this.windowSize
      };
    }
  }

  class CircuitBreaker {
    constructor(options = {}) {
      this.errorThreshold = options.errorThreshold || 50;
      this.recoveryTime = options.recoveryTime || 30000;
      this.state = 'CLOSED';
      this.openTime = 0;
      this.totalRequests = 0;
      this.errorCount = 0;
      this.halfOpenAttempts = 0;
      this.maxHalfOpenAttempts = options.maxHalfOpenAttempts || 3;
      this.windowSize = options.windowSize || 60000;
      this.requestTimestamps = [];
      this.errorTimestamps = [];
    }

    canExecute() {
      const now = Date.now();
      
      if (this.state === 'OPEN') {
        if (now - this.openTime > this.recoveryTime) {
          this.state = 'HALF_OPEN';
          this.halfOpenAttempts = 0;
          return { allowed: true, state: 'HALF_OPEN' };
        }
        return { allowed: false, state: 'OPEN', retryAfter: this.recoveryTime - (now - this.openTime) };
      }
      
      if (this.state === 'HALF_OPEN') {
        if (this.halfOpenAttempts >= this.maxHalfOpenAttempts) {
          return { allowed: false, state: 'HALF_OPEN', message: 'Max half-open attempts reached' };
        }
        this.halfOpenAttempts++;
      }
      
      return { allowed: true, state: this.state };
    }

    recordSuccess() {
      const now = Date.now();
      this.totalRequests++;
      this.requestTimestamps.push(now);
      this.cleanupOldTimestamps(now);
      
      if (this.state === 'HALF_OPEN') {
        this.halfOpenAttempts++;
        if (this.halfOpenAttempts >= this.maxHalfOpenAttempts) {
          this.close();
        }
      }
    }

    recordError(error) {
      const now = Date.now();
      this.totalRequests++;
      this.errorCount++;
      this.requestTimestamps.push(now);
      this.errorTimestamps.push(now);
      this.cleanupOldTimestamps(now);
      
      const errorRate = this.calculateErrorRate();
      
      if (this.state === 'CLOSED' && errorRate >= this.errorThreshold) {
        this.open();
      } else if (this.state === 'HALF_OPEN') {
        this.open();
      }
    }

    open() {
      this.state = 'OPEN';
      this.openTime = Date.now();
    }

    close() {
      this.state = 'CLOSED';
      this.halfOpenAttempts = 0;
      this.errorCount = 0;
      this.totalRequests = 0;
    }

    calculateErrorRate() {
      if (this.totalRequests === 0) return 0;
      if (this.totalRequests < 10) return 0;
      return (this.errorCount / this.totalRequests) * 100;
    }

    cleanupOldTimestamps(now) {
      const cutoff = now - this.windowSize;
      this.requestTimestamps = this.requestTimestamps.filter(t => t > cutoff);
      this.errorTimestamps = this.errorTimestamps.filter(t => t > cutoff);
    }

    updateConfig(options) {
      if (options.errorThreshold !== undefined) {
        this.errorThreshold = options.errorThreshold;
      }
      if (options.recoveryTime !== undefined) {
        this.recoveryTime = options.recoveryTime;
      }
    }

    getStats() {
      return {
        state: this.state,
        errorRate: this.calculateErrorRate().toFixed(2) + '%',
        errorThreshold: this.errorThreshold + '%',
        totalRequests: this.totalRequests,
        errorCount: this.errorCount,
        recoveryTime: this.recoveryTime,
        openTime: this.state === 'OPEN' ? this.openTime : null
      };
    }
  }

  class ApiMonitor {
    constructor(apiId) {
      this.apiId = apiId;
      this.totalRequests = 0;
      this.successRequests = 0;
      this.failedRequests = 0;
      this.responseTimes = [];
      this.logs = [];
      this.maxLogs = 1000;
      this.startTime = Date.now();
      this.rateLimiter = null;
      this.circuitBreaker = null;
    }

    recordRequest(success, duration, params = {}, error = null) {
      const now = Date.now();
      
      this.totalRequests++;
      if (success) {
        this.successRequests++;
      } else {
        this.failedRequests++;
      }
      
      this.responseTimes.push(duration);
      if (this.responseTimes.length > 1000) {
        this.responseTimes.shift();
      }
      
      this.logs.push({
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        timestamp: now,
        success,
        duration,
        params,
        error
      });
      
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
    }

    getStats() {
      const avgResponseTime = this.responseTimes.length > 0
        ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
        : 0;
      
      const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
      const p50 = this.getPercentile(sortedTimes, 50);
      const p95 = this.getPercentile(sortedTimes, 95);
      const p99 = this.getPercentile(sortedTimes, 99);
      
      const errorRate = this.totalRequests > 0
        ? (this.failedRequests / this.totalRequests * 100).toFixed(2)
        : 0;
      
      return {
        totalRequests: this.totalRequests,
        successRequests: this.successRequests,
        failedRequests: this.failedRequests,
        errorRate: errorRate + '%',
        avgResponseTime,
        p50,
        p95,
        p99,
        uptime: this.formatUptime(Date.now() - this.startTime),
        rateLimiterStats: this.rateLimiter?.getStats(),
        circuitBreakerStats: this.circuitBreaker?.getStats()
      };
    }

    getPercentile(sortedArray, percentile) {
      if (sortedArray.length === 0) return 0;
      const index = Math.ceil(sortedArray.length * percentile / 100) - 1;
      return sortedArray[Math.max(0, index)];
    }

    formatUptime(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) return `${days}天 ${hours % 24}小时`;
      if (hours > 0) return `${hours}小时 ${minutes % 60}分钟`;
      if (minutes > 0) return `${minutes}分钟 ${seconds % 60}秒`;
      return `${seconds}秒`;
    }

    clearLogs() {
      this.logs = [];
    }

    reset() {
      this.totalRequests = 0;
      this.successRequests = 0;
      this.failedRequests = 0;
      this.responseTimes = [];
      this.logs = [];
      this.startTime = Date.now();
    }

    configureRateLimiter(options) {
      if (!this.rateLimiter) {
        this.rateLimiter = new RateLimiter(options);
      } else {
        this.rateLimiter.updateConfig(options);
      }
      return this.rateLimiter;
    }

    configureCircuitBreaker(options) {
      if (!this.circuitBreaker) {
        this.circuitBreaker = new CircuitBreaker(options);
      } else {
        this.circuitBreaker.updateConfig(options);
      }
      return this.circuitBreaker;
    }
  }

  class TopologyBuilder {
    constructor() {
      this.services = new Map();
      this.connections = [];
    }

    addService(name, metadata = {}) {
      if (!this.services.has(name)) {
        this.services.set(name, {
          name,
          x: 0,
          y: 0,
          category: metadata.category || 'service',
          status: metadata.status || 'unknown',
          calls: 0,
          errors: 0,
          ...metadata
        });
      }
      return this.services.get(name);
    }

    addConnection(from, to, metadata = {}) {
      this.addService(from);
      this.addService(to);
      
      const existing = this.connections.find(c => c.from === from && c.to === to);
      if (existing) {
        existing.calls = (existing.calls || 0) + 1;
        if (metadata.error) existing.errors = (existing.errors || 0) + 1;
      } else {
        this.connections.push({
          from,
          to,
          calls: 1,
          errors: metadata.error ? 1 : 0,
          method: metadata.method,
          type: metadata.type || 'http'
        });
      }
    }

    calculateLayout() {
      const serviceList = Array.from(this.services.values());
      const width = 800;
      const height = 400;
      
      const categories = {};
      serviceList.forEach(s => {
        const cat = s.category || 'service';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(s);
      });
      
      const categoryList = Object.keys(categories);
      const categoryWidth = width / categoryList.length;
      
      categoryList.forEach((cat, catIdx) => {
        const services = categories[cat];
        const x = categoryWidth * catIdx + categoryWidth / 2;
        const ySpacing = height / (services.length + 1);
        
        services.forEach((s, idx) => {
          s.x = x;
          s.y = ySpacing * (idx + 1);
        });
      });
    }

    getEChartsOption() {
      this.calculateLayout();
      
      const serviceList = Array.from(this.services.values());
      const serviceMap = new Map(serviceList.map((s, i) => [s.name, i]));
      
      const nodes = serviceList.map(s => ({
        name: s.name,
        value: s.calls || 0,
        symbolSize: Math.max(30, Math.min(60, 30 + (s.calls || 0) / 100)),
        category: this.getCategoryIndex(s.category),
        itemStyle: this.getServiceColor(s)
      }));
      
      const links = this.connections.map(c => ({
        source: c.from,
        target: c.to,
        value: c.calls,
        lineStyle: {
          width: Math.max(1, Math.min(5, c.calls / 100)),
          color: c.errors > 0 ? '#ff4d4f' : '#91d5ff'
        }
      }));
      
      return {
        tooltip: {
          trigger: 'item',
          formatter: function(params) {
            if (params.dataType === 'edge') {
              return `${params.data.source} → ${params.data.target}<br/>调用次数: ${params.data.value || 0} 次`;
            }
            const service = serviceList[params.dataIndex];
            return `<strong>${params.name}</strong><br/>` +
                   `调用次数: ${service?.calls || 0} 次<br/>` +
                   `错误次数: ${service?.errors || 0} 次<br/>` +
                   `状态: ${service?.status || '未知'}`;
          }
        },
        legend: {
          data: ['Gateway', 'Service', 'Database', 'External'],
          top: 10
        },
        series: [{
          type: 'graph',
          layout: 'none',
          roam: true,
          label: {
            show: true,
            position: 'bottom',
            formatter: '{b}'
          },
          draggable: false,
          data: nodes,
          links: links,
          lineStyle: {
            curveness: 0.2,
            opacity: 0.8
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 10
            }
          }
        }]
      };
    }

    getCategoryIndex(category) {
      const categories = ['Gateway', 'Service', 'Database', 'External'];
      const idx = categories.indexOf(category);
      return idx >= 0 ? idx : 1;
    }

    getServiceColor(service) {
      const colors = {
        Gateway: { color: '#667eea' },
        Service: { color: '#1890ff' },
        Database: { color: '#52c41a' },
        External: { color: '#faad14' }
      };
      
      if (service.status === 'error') {
        return { color: '#ff4d4f' };
      }
      if (service.status === 'warning') {
        return { color: '#faad14' };
      }
      
      return colors[service.category] || colors.Service;
    }

    recordApiCall(apiConfig, flowNodes) {
      this.addService('Gateway', { category: 'Gateway', status: 'healthy' });
      
      flowNodes.forEach(node => {
        if (node.type === 'http' && node.config?.url) {
          const url = node.config.url;
          let serviceName = 'Unknown Service';
          
          try {
            const hostname = new URL(url.startsWith('http') ? url : 'http://dummy' + url).hostname;
            serviceName = hostname || node.name;
          } catch (e) {
            serviceName = node.name;
          }
          
          this.addService(serviceName, { 
            category: 'Service', 
            status: 'healthy',
            url: node.config.url
          });
          
          this.addConnection('Gateway', serviceName, {
            method: node.config.method,
            type: 'http'
          });
        }
      });
    }

    reset() {
      this.services.clear();
      this.connections = [];
    }
  }

  function createMonitor(apiId) {
    return new ApiMonitor(apiId);
  }

  function createTopologyBuilder() {
    return new TopologyBuilder();
  }

  function createRateLimiter(options) {
    return new RateLimiter(options);
  }

  function createCircuitBreaker(options) {
    return new CircuitBreaker(options);
  }

  return {
    RateLimiter,
    CircuitBreaker,
    ApiMonitor,
    TopologyBuilder,
    createMonitor,
    createTopologyBuilder,
    createRateLimiter,
    createCircuitBreaker
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GatewayMonitor;
}