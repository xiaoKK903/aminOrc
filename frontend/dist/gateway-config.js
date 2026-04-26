const GatewayConfig = (function() {
  'use strict';

  const STORAGE_KEY = 'gateway_apis';

  function generateId() {
    return 'api_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function getApis() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load APIs:', e);
      return [];
    }
  }

  function saveApis(apis) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(apis));
    } catch (e) {
      console.error('Failed to save APIs:', e);
    }
  }

  function addApi(api) {
    const apis = getApis();
    apis.push(api);
    saveApis(apis);
    return api;
  }

  function updateApi(id, updates) {
    const apis = getApis();
    const idx = apis.findIndex(a => a.id === id);
    if (idx > -1) {
      apis[idx] = { ...apis[idx], ...updates };
      saveApis(apis);
      return apis[idx];
    }
    return null;
  }

  function deleteApi(id) {
    const apis = getApis();
    const filtered = apis.filter(a => a.id !== id);
    saveApis(filtered);
  }

  function getApi(id) {
    const apis = getApis();
    return apis.find(a => a.id === id);
  }

  function publishApi(id) {
    return updateApi(id, { status: 'active', publishedAt: Date.now() });
  }

  function unpublishApi(id) {
    return updateApi(id, { status: 'draft' });
  }

  const MOCK_SERVICES = [
    { name: 'user-service', baseUrl: 'http://localhost:8081', endpoints: ['/api/users', '/api/users/:id', '/api/users/:id/profile'] },
    { name: 'order-service', baseUrl: 'http://localhost:8082', endpoints: ['/api/orders', '/api/orders/:id', '/api/orders/user/:userId'] },
    { name: 'payment-service', baseUrl: 'http://localhost:8083', endpoints: ['/api/payments', '/api/payments/:id', '/api/payments/balance/:userId'] },
    { name: 'inventory-service', baseUrl: 'http://localhost:8084', endpoints: ['/api/inventory', '/api/inventory/:productId', '/api/inventory/check'] },
    { name: 'notification-service', baseUrl: 'http://localhost:8085', endpoints: ['/api/notifications', '/api/notifications/send', '/api/notifications/user/:userId'] },
    { name: 'search-service', baseUrl: 'http://localhost:8086', endpoints: ['/api/search', '/api/search/suggest', '/api/search/advanced'] }
  ];

  function getMockServices() {
    return [...MOCK_SERVICES];
  }

  function generateMockApi() {
    const services = getMockServices();
    const service = services[Math.floor(Math.random() * services.length)];
    const endpoint = service.endpoints[Math.floor(Math.random() * service.endpoints.length)];
    
    return {
      id: generateId(),
      name: `聚合 ${service.name.replace('-', ' ')}`,
      method: ['GET', 'POST'][Math.floor(Math.random() * 2)],
      path: `/api/aggregation/v1/' + service.name + endpoint.replace('/api/', '').replace('/', '-'),
      description: `聚合调用 ${service.name} 的数据`,
      status: Math.random() > 0.5 ? 'active' : 'draft',
      timeout: 30000,
      cacheTtl: 0,
      params: [],
      aggregationScript: `// 聚合脚本示例
return {
  success: true,
  data: {
    service: '${service.name}',
    endpoint: '${endpoint}',
    timestamp: Date.now()
  }
};`,
      flowNodes: [],
      rateLimit: { enabled: false, maxQps: 100, strategy: 'reject' },
      circuitBreaker: { errorThreshold: 50, recoveryTime: 30 },
      createdAt: Date.now() - Math.random() * 86400000 * 7,
      updatedAt: Date.now()
    };
  }

  function createSampleApis(count = 3) {
    const apis = [];
    for (let i = 0; i < count; i++) {
      apis.push(generateMockApi());
    }
    return apis;
  }

  function initSampleData() {
    if (getApis().length === 0) {
      const samples = createSampleApis(3);
      samples.forEach(api => addApi(api));
    }
  }

  return {
    generateId,
    getApis,
    saveApis,
    addApi,
    updateApi,
    deleteApi,
    getApi,
    publishApi,
    unpublishApi,
    getMockServices,
    generateMockApi,
    createSampleApis,
    initSampleData,
    STORAGE_KEY
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GatewayConfig;
}