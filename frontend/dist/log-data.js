const LogData = (function() {
  'use strict';

  const SERVICES = [
    'user-service',
    'order-service',
    'payment-service',
    'gateway-service',
    'auth-service',
    'inventory-service',
    'notification-service',
    'search-service'
  ];

  const LOG_LEVELS = [
    { name: 'ERROR', weight: 5 },
    { name: 'WARN', weight: 15 },
    { name: 'INFO', weight: 60 },
    { name: 'DEBUG', weight: 20 }
  ];

  const ERROR_MESSAGES = [
    'NullPointerException: Cannot read property \'id\' of null',
    'DatabaseConnectionException: Connection timed out after 30s',
    'SQLException: ORA-00001: unique constraint violated',
    'IOException: Connection reset by peer',
    'HttpServerErrorException: 503 Service Unavailable',
    'ValidationException: Invalid email format',
    'TimeoutException: Request took longer than 30000ms',
    'CircuitBreakerOpenException: Circuit breaker is OPEN for user-service',
    'RateLimitExceededException: Rate limit exceeded: 100/sec',
    'DeadlockLoserDataAccessException: Transaction was selected as the deadlock victim'
  ];

  const WARN_MESSAGES = [
    'Slow query detected: execution took 2500ms',
    'High memory usage: 85% of heap allocated',
    'Connection pool exhausted: 100/100 connections in use',
    'Retry attempt 2/3 for payment-service',
    'Deprecated API called: getOldUser() will be removed in v3.0',
    'Configuration mismatch: expected timeout 30s, got 60s',
    'Cache miss rate high: 65% for userCache',
    'Thread starvation detected: 100 threads blocked on user-service',
    'Log rotation took longer than expected: 5000ms',
    'JVM heap close to threshold: 82% used'
  ];

  const INFO_MESSAGES = [
    'User login successful: user_id=12345, ip=192.168.1.100',
    'Order created: order_id=ORD-887621, total_amount=599.00',
    'Payment processed: transaction_id=TXN-99821, status=SUCCESS',
    'Request completed: GET /api/users/123, status=200, duration=45ms',
    'Cache hit: key=user:12345, source=redis',
    'Email sent: to=user@example.com, template=order_confirmation',
    'Database query executed: SELECT * FROM users WHERE id = ?, rows=1, duration=12ms',
    'Service health check passed: status=UP, response_time=5ms',
    'Scheduled task completed: job=generate_daily_report, duration=120000ms',
    'API rate limit: remaining=950/1000, reset_in=3600s'
  ];

  const DEBUG_MESSAGES = [
    'Entering method: UserController.getUserById(id=123)',
    'Query parameters: { page: 1, size: 20, sort: \'created_at desc\' }',
    'SQL query: SELECT id, name, email FROM users WHERE status = ?',
    'Request headers: { Authorization: \'Bearer xxx\', Content-Type: \'application/json\' }',
    'Response body: { \'total\': 100, \'data\': [...] }',
    'Connection acquired: pool=primary, id=conn-456',
    'Transaction started: tx-id=tx-789012, isolation=READ_COMMITTED',
    'Cache invalidated: keys=[user:123, order:456]',
    'Metric recorded: counter=api.requests, value=1, tags={service:user-service}',
    'Config loaded: source=consul, key=db.connection.pool.size, value=100'
  ];

  const EXCEPTION_STACKS = [
`java.lang.NullPointerException: Cannot read property 'id' of null
    at com.example.service.UserService.getUserById(UserService.java:123)
    at com.example.controller.UserController.getUser(UserController.java:45)
    at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
    at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:897)
    at javax.servlet.http.HttpServlet.service(HttpServlet.java:750)
    at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:231)
    at org.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:197)
    at org.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:78)
    at org.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:357)
    at org.apache.coyote.http11.Http11Processor.service(Http11Processor.java:400)
    at java.base/java.lang.Thread.run(Thread.java:833)`,

`org.springframework.dao.DeadlockLoserDataAccessException: Transaction was selected as the deadlock victim
    at org.springframework.jdbc.support.SQLErrorCodeSQLExceptionTranslator.translateException(SQLErrorCodeSQLExceptionTranslator.java:270)
    at org.springframework.jdbc.core.JdbcTemplate.execute(JdbcTemplate.java:651)
    at org.springframework.jdbc.core.JdbcTemplate.update(JdbcTemplate.java:904)
    at com.example.repository.OrderRepository.save(OrderRepository.java:89)
    at com.example.service.OrderService.createOrder(OrderService.java:56)
    at com.example.controller.OrderController.create(OrderController.java:34)
    at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed(CglibAopProxy.java:763)
    at org.springframework.transaction.interceptor.TransactionAspectSupport.invokeWithinTransaction(TransactionAspectSupport.java:399)
    at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)
    at java.base/java.lang.Thread.run(Thread.java:833)`,

`io.github.resilience4j.circuitbreaker.CallNotPermittedException: CircuitBreaker 'payment-service' is OPEN
    at io.github.resilience4j.circuitbreaker.CircuitBreaker.lambda$decorateCallable$5(CircuitBreaker.java:307)
    at io.vavr.CheckedFunction0.liftTry(CheckedFunction0.java:36)
    at org.springframework.cloud.circuitbreaker.resilience4j.Resilience4jCircuitBreakerFactory$Resilience4jCircuitBreaker.run(Resilience4jCircuitBreakerFactory.java:136)
    at com.example.client.PaymentClient.processPayment(PaymentClient.java:78)
    at com.example.service.OrderService.processPayment(OrderService.java:234)
    at java.base/java.util.concurrent.CompletableFuture$AsyncSupply.run(CompletableFuture.java:1768)
    at java.base/java.lang.Thread.run(Thread.java:833)`
  ];

  function generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  function generateTraceId() {
    return 'trace-' + Math.random().toString(36).substr(2, 16);
  }

  function generateSpanId() {
    return 'span-' + Math.random().toString(36).substr(2, 8);
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function weightedRandom(items, weightKey) {
    const totalWeight = items.reduce((sum, item) => sum + item[weightKey], 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
      random -= item[weightKey];
      if (random <= 0) return item.name;
    }
    return items[0].name;
  }

  function generateTimestamp(minutesAgo) {
    const now = Date.now();
    const offset = Math.random() * minutesAgo * 60 * 1000;
    return now - offset;
  }

  function generateSingleLog() {
    const level = weightedRandom(LOG_LEVELS, 'weight');
    const service = randomFromArray(SERVICES);
    const traceId = generateTraceId();
    const spanId = generateSpanId();
    const timestamp = Date.now() - Math.floor(Math.random() * 60000);
    
    let message = '';
    let stack = null;
    let context = {};

    switch (level) {
      case 'ERROR':
        message = randomFromArray(ERROR_MESSAGES);
        stack = Math.random() > 0.3 ? randomFromArray(EXCEPTION_STACKS) : null;
        context = {
          error_code: 'ERR-' + randomInt(1000, 9999),
          retry_count: randomInt(0, 5),
          upstream_service: randomFromArray(SERVICES)
        };
        break;
      case 'WARN':
        message = randomFromArray(WARN_MESSAGES);
        context = {
          warning_type: Math.random() > 0.5 ? 'PERFORMANCE' : 'RESOURCE',
          threshold: randomInt(80, 95) + '%'
        };
        break;
      case 'INFO':
        message = randomFromArray(INFO_MESSAGES);
        context = {
          user_id: randomInt(1000, 9999),
          request_id: generateId(),
          duration_ms: randomInt(10, 500)
        };
        break;
      case 'DEBUG':
        message = randomFromArray(DEBUG_MESSAGES);
        context = {
          method: randomFromArray(['GET', 'POST', 'PUT', 'DELETE']),
          endpoint: '/api/' + randomFromArray(['users', 'orders', 'payments', 'products'])
        };
        break;
    }

    return {
      id: generateId(),
      timestamp,
      level,
      service,
      traceId,
      spanId,
      message,
      stack,
      context,
      _raw: { level, service, traceId, spanId }
    };
  }

  function generateLogs(count) {
    const logs = [];
    const traceSpans = new Map();
    
    for (let i = 0; i < count; i++) {
      const log = generateSingleLog();
      
      if (Math.random() > 0.7 && traceSpans.has(log.traceId)) {
        log._raw.parentSpanId = traceSpans.get(log.traceId);
      }
      traceSpans.set(log.traceId, log.spanId);
      
      logs.push(log);
    }
    
    logs.sort((a, b) => a.timestamp - b.timestamp);
    
    return logs;
  }

  function generatePerformanceMetrics() {
    const services = SERVICES;
    const metrics = {};
    
    services.forEach(service => {
      metrics[service] = {
        cpu: randomInt(20, 85),
        memory: randomInt(40, 90),
        disk: randomInt(30, 85),
        network: {
          in: randomInt(100, 10000),
          out: randomInt(100, 10000)
        },
        requests_per_second: randomInt(10, 5000),
        error_rate: randomInt(0, 10) / 100,
        avg_response_time: randomInt(10, 500),
        p95_response_time: randomInt(50, 2000),
        p99_response_time: randomInt(200, 5000),
        connections: {
          active: randomInt(10, 100),
          idle: randomInt(5, 50),
          total: randomInt(50, 200)
        },
        gc: {
          young_gc_count: randomInt(10, 100),
          young_gc_time: randomInt(100, 1000),
          old_gc_count: randomInt(1, 10),
          old_gc_time: randomInt(500, 5000)
        },
        heap: {
          used: randomInt(512, 2048),
          committed: randomInt(1024, 4096),
          max: 4096
        }
      };
    });
    
    return metrics;
  }

  function generateTraceSpans(traceId) {
    const spans = [];
    const spanCount = randomInt(3, 8);
    const services = randomFromArray([
      ['gateway-service', 'auth-service', 'user-service'],
      ['gateway-service', 'order-service', 'payment-service', 'inventory-service'],
      ['gateway-service', 'search-service', 'user-service', 'notification-service']
    ]);
    
    let startTime = Date.now() - randomInt(100, 1000);
    let totalDuration = 0;
    let parentSpanId = null;
    
    for (let i = 0; i < spanCount; i++) {
      const spanId = generateSpanId();
      const duration = randomInt(10, 200);
      totalDuration += duration;
      
      spans.push({
        traceId,
        spanId,
        parentSpanId,
        operationName: randomFromArray([
          'HTTP GET /api/users',
          'Database Query',
          'External API Call',
          'Cache Lookup',
          'Message Publish',
          'Authentication',
          'Authorization Check',
          'Validation'
        ]),
        serviceName: services[i % services.length],
        startTime: startTime,
        duration,
        tags: {
          http_method: randomFromArray(['GET', 'POST', 'PUT', 'DELETE']),
          http_status_code: randomFromArray([200, 201, 400, 401, 404, 500]),
          db_statement: 'SELECT * FROM users WHERE id = ?',
          db_type: 'mysql',
          peer_service: randomFromArray(SERVICES)
        },
        logs: [
          { timestamp: startTime, message: 'Started processing request' },
          { timestamp: startTime + Math.floor(duration * 0.3), message: 'Cache check completed' },
          { timestamp: startTime + Math.floor(duration * 0.7), message: 'Database query completed' },
          { timestamp: startTime + duration, message: 'Request completed' }
        ]
      });
      
      parentSpanId = spanId;
      startTime += Math.floor(duration * 0.8);
    }
    
    return {
      traceId,
      spans,
      totalDuration,
      serviceCount: new Set(spans.map(s => s.serviceName)).size,
      hasError: spans.some(s => s.tags.http_status_code >= 400)
    };
  }

  function generateAlertRules() {
    return [
      {
        id: 'high-error-rate',
        name: '高错误率告警',
        description: '服务错误率超过 5%',
        query: 'rate(error_count[5m]) / rate(request_count[5m]) > 0.05',
        severity: 'critical',
        enabled: true
      },
      {
        id: 'high-response-time',
        name: '响应时间过高',
        description: 'P99 响应时间超过 1 秒',
        query: 'histogram_quantile(0.99, rate(response_time_bucket[5m])) > 1000',
        severity: 'warning',
        enabled: true
      },
      {
        id: 'high-cpu-usage',
        name: 'CPU使用率过高',
        description: 'CPU使用率超过 80%',
        query: 'cpu_usage > 80',
        severity: 'warning',
        enabled: true
      },
      {
        id: 'low-disk-space',
        name: '磁盘空间不足',
        description: '磁盘剩余空间低于 20%',
        query: 'disk_free / disk_total < 0.2',
        severity: 'critical',
        enabled: true
      },
      {
        id: 'service-down',
        name: '服务下线',
        description: '服务健康检查失败',
        query: 'health_status == 0',
        severity: 'critical',
        enabled: true
      }
    ];
  }

  return {
    generateId,
    generateTraceId,
    generateSpanId,
    randomInt,
    randomFromArray,
    generateSingleLog,
    generateLogs,
    generatePerformanceMetrics,
    generateTraceSpans,
    generateAlertRules,
    SERVICES,
    LOG_LEVELS,
    ERROR_MESSAGES,
    WARN_MESSAGES,
    INFO_MESSAGES,
    DEBUG_MESSAGES
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LogData;
}