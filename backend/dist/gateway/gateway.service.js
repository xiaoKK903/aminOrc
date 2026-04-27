"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
}();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayService = void 0;
const common_1 = require("@nestjs/common");
const json_storage_service_1 = require("../common/json-storage.service");
const uuid_1 = require("uuid");
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const url_1 = require("url");
let GatewayService = class GatewayService {
    storageService;
    dynamicRoutes = new Map();
    rateLimiters = new Map();
    circuitBreakers = new Map();
    requestLogs = [];
    constructor(storageService) {
        this.storageService = storageService;
        this.initDynamicRoutes();
    }
    initDynamicRoutes() {
        const apis = this.findAll();
        apis.forEach(api => {
            if (api.status === 'active') {
                this.dynamicRoutes.set(api.id, api);
            }
        });
        console.log(`[Gateway] 已加载 ${this.dynamicRoutes.size} 个动态路由`);
    }
    findAll(page = 1, pageSize = 100) {
        const apis = this.storageService.read('gateway-apis');
        return this.storageService.paginate(apis, page, pageSize);
    }
    findOne(id) {
        const apis = this.storageService.read('gateway-apis');
        const api = apis.find(a => a.id === id);
        if (!api) {
            throw new common_1.NotFoundException('接口不存在');
        }
        return api;
    }
    create(createDto) {
        const apis = this.storageService.read('gateway-apis');
        const existing = apis.find(a => a.path === createDto.path && a.method === createDto.method);
        if (existing) {
            throw new common_1.BadRequestException('相同路径和方法的接口已存在');
        }
        const api = {
            id: (0, uuid_1.v4)(),
            ...createDto,
            status: 'draft',
            flowNodes: createDto.flowNodes || [],
            params: createDto.params || [],
            rateLimit: createDto.rateLimit || { enabled: false, maxQps: 100, strategy: 'reject' },
            circuitBreaker: createDto.circuitBreaker || { errorThreshold: 50, recoveryTime: 30 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.storageService.create('gateway-apis', api);
        return api;
    }
    update(id, updateDto) {
        const apis = this.storageService.read('gateway-apis');
        const index = apis.findIndex(a => a.id === id);
        if (index === -1) {
            throw new common_1.NotFoundException('接口不存在');
        }
        const updated = {
            ...apis[index],
            ...updateDto,
            updatedAt: new Date().toISOString(),
        };
        this.storageService.update('gateway-apis', id, updated);
        if (this.dynamicRoutes.has(id)) {
            this.dynamicRoutes.set(id, updated);
        }
        return updated;
    }
    remove(id) {
        this.storageService.delete('gateway-apis', id);
        this.dynamicRoutes.delete(id);
        this.rateLimiters.delete(id);
        this.circuitBreakers.delete(id);
        return { message: '删除成功' };
    }
    publish(id) {
        const api = this.update(id, {
            status: 'active',
            publishedAt: new Date().toISOString(),
        });
        this.dynamicRoutes.set(id, api);
        this.initRateLimiter(id, api.rateLimit);
        this.initCircuitBreaker(id, api.circuitBreaker);
        console.log(`[Gateway] 接口已发布: ${api.method} ${api.path}`);
        return api;
    }
    unpublish(id) {
        const api = this.update(id, { status: 'draft' });
        this.dynamicRoutes.delete(id);
        console.log(`[Gateway] 接口已下线: ${api.method} ${api.path}`);
        return api;
    }
    initRateLimiter(id, config) {
        if (config && config.enabled) {
            this.rateLimiters.set(id, {
                maxQps: config.maxQps,
                strategy: config.strategy,
                requests: [],
                windowSize: 1000,
            });
        }
    }
    initCircuitBreaker(id, config) {
        this.circuitBreakers.set(id, {
            state: 'CLOSED',
            errorThreshold: config?.errorThreshold || 50,
            recoveryTime: (config?.recoveryTime || 30) * 1000,
            failureCount: 0,
            successCount: 0,
            lastFailureTime: 0,
            halfOpenSuccessCount: 0,
            halfOpenFailures: 0,
        });
    }
    checkRateLimit(apiId) {
        const limiter = this.rateLimiters.get(apiId);
        if (!limiter)
            return { allowed: true };
        const now = Date.now();
        limiter.requests = limiter.requests.filter(time => now - time < limiter.windowSize);
        if (limiter.requests.length >= limiter.maxQps) {
            return { allowed: false, retryAfter: Math.ceil((limiter.requests[0] + limiter.windowSize - now) / 1000) };
        }
        limiter.requests.push(now);
        return { allowed: true };
    }
    checkCircuitBreaker(apiId) {
        const breaker = this.circuitBreakers.get(apiId);
        if (!breaker)
            return { allowed: true };
        const now = Date.now();
        if (breaker.state === 'OPEN') {
            if (now - breaker.lastFailureTime > breaker.recoveryTime) {
                breaker.state = 'HALF_OPEN';
                breaker.halfOpenSuccessCount = 0;
                breaker.halfOpenFailures = 0;
                console.log(`[CircuitBreaker] ${apiId} 进入半开状态`);
            }
            else {
                const remaining = Math.ceil((breaker.recoveryTime - (now - breaker.lastFailureTime)) / 1000);
                return { allowed: false, state: 'OPEN', remaining };
            }
        }
        return { allowed: true, state: breaker.state };
    }
    recordSuccess(apiId) {
        const breaker = this.circuitBreakers.get(apiId);
        if (!breaker)
            return;
        if (breaker.state === 'HALF_OPEN') {
            breaker.halfOpenSuccessCount++;
            if (breaker.halfOpenSuccessCount >= 3) {
                breaker.state = 'CLOSED';
                breaker.failureCount = 0;
                breaker.successCount = 0;
                console.log(`[CircuitBreaker] ${apiId} 熔断器关闭`);
            }
        }
        else {
            breaker.successCount++;
            if (breaker.successCount > breaker.failureCount * 2) {
                breaker.failureCount = 0;
            }
        }
    }
    recordError(apiId, error) {
        const breaker = this.circuitBreakers.get(apiId);
        if (!breaker)
            return;
        breaker.failureCount++;
        breaker.lastFailureTime = Date.now();
        if (breaker.state === 'HALF_OPEN') {
            breaker.halfOpenFailures++;
            breaker.state = 'OPEN';
            console.log(`[CircuitBreaker] ${apiId} 半开状态失败，再次熔断`);
        }
        else if (breaker.state === 'CLOSED') {
            const totalRequests = breaker.successCount + breaker.failureCount;
            const errorRate = totalRequests > 0 ? (breaker.failureCount / totalRequests) * 100 : 0;
            if (errorRate >= breaker.errorThreshold && totalRequests >= 10) {
                breaker.state = 'OPEN';
                console.log(`[CircuitBreaker] ${apiId} 熔断器打开，错误率: ${errorRate}%`);
            }
        }
    }
    async executeApi(apiId, requestData) {
        const api = this.findOne(apiId);
        const start = Date.now();
        let result = null;
        let error = null;
        try {
            const rateLimitCheck = this.checkRateLimit(apiId);
            if (!rateLimitCheck.allowed) {
                throw new common_1.TooManyRequestsException(`请求被限流，请在 ${rateLimitCheck.retryAfter} 秒后重试`);
            }
            const circuitCheck = this.checkCircuitBreaker(apiId);
            if (!circuitCheck.allowed) {
                throw new common_1.ServiceUnavailableException(`服务暂时不可用，请在 ${circuitCheck.remaining} 秒后重试`);
            }
            result = await this.executeFlow(api.flowNodes || [], requestData);
            if (api.aggregationScript) {
                result = await this.executeScript(api.aggregationScript, result, requestData);
            }
            this.recordSuccess(apiId);
        }
        catch (e) {
            error = e;
            this.recordError(apiId, e);
            throw e;
        }
        finally {
            const duration = Date.now() - start;
            this.logRequest({
                apiId,
                method: api.method,
                path: api.path,
                statusCode: error ? (error.status || 500) : 200,
                duration,
                timestamp: new Date().toISOString(),
                error: error ? error.message : null,
            });
        }
        return result;
    }
    async executeFlow(nodes, requestData) {
        const results = {};
        let currentData = requestData;
        for (const node of nodes) {
            if (node.disabled)
                continue;
            const nodeResult = await this.executeNode(node, currentData, results);
            results[node.id] = nodeResult;
            if (node.type !== 'condition') {
                currentData = nodeResult;
            }
        }
        return currentData;
    }
    async executeNode(node, data, results) {
        const startTime = Date.now();
        try {
            switch (node.type) {
                case 'http':
                    return await this.executeHttpNode(node.config, data);
                case 'script':
                    return await this.executeScriptNode(node.config, data);
                case 'merge':
                    return this.executeMergeNode(node.config, results, data);
                case 'condition':
                    return this.executeConditionNode(node.config, data);
                default:
                    return data;
            }
        }
        catch (error) {
            console.error(`[Gateway] 节点执行失败 [${node.id}]:`, error.message);
            throw error;
        }
    }
    async executeHttpNode(config, data) {
        const url = this.replaceVariables(config.url, data);
        const method = config.method || 'GET';
        const headers = this.replaceHeaders(config.headers || {}, data);
        const body = config.body ? this.replaceVariables(config.body, data) : undefined;
        const timeout = config.timeout || 30000;
        return this.makeHttpRequest(url, method, headers, body, timeout);
    }
    async makeHttpRequest(url, method, headers, body, timeout) {
        return new Promise((resolve, reject) => {
            const parsedUrl = (0, url_1.parse)(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const client = isHttps ? https : http;
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.path,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                timeout: timeout,
            };
            const req = client.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsed);
                        }
                        else {
                            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                        }
                    }
                    catch {
                        resolve({ raw: responseData, status: res.statusCode });
                    }
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('请求超时'));
            });
            if (body && method !== 'GET' && method !== 'HEAD') {
                req.write(typeof body === 'string' ? body : JSON.stringify(body));
            }
            req.end();
        });
    }
    async executeScriptNode(config, data) {
        if (!config.script)
            return data;
        return this.executeScript(config.script, data, {});
    }
    executeMergeNode(config, results, data) {
        const mergeType = config.mergeType || 'object';
        if (mergeType === 'array') {
            return Object.values(results);
        }
        const merged = { ...data };
        for (const [nodeId, result] of Object.entries(results)) {
            if (typeof result === 'object' && result !== null) {
                Object.assign(merged, result);
            }
        }
        return merged;
    }
    executeConditionNode(config, data) {
        try {
            const condition = config.condition || 'true';
            const fn = new Function('data', `return ${condition}`);
            return fn(data);
        }
        catch (error) {
            console.error('[Gateway] 条件判断失败:', error.message);
            return false;
        }
    }
    replaceVariables(template, data) {
        if (!template || typeof template !== 'string')
            return template;
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] !== undefined ? String(data[key]) : match;
        });
    }
    replaceHeaders(headers, data) {
        const result = {};
        for (const [key, value] of Object.entries(headers)) {
            result[key] = this.replaceVariables(value, data);
        }
        return result;
    }
    async executeScript(script, data, requestData) {
        const FORBIDDEN_PATTERNS = [
            /document\s*\./g, /window\s*\./g, /eval\s*\(/g,
            /new\s+Function/g, /setTimeout\s*\(/g, /setInterval\s*\(/g,
            /fetch\s*\(/g, /XMLHttpRequest/g, /localStorage/g,
            /indexedDB/g, /process\s*\./g, /require\s*\(/g,
            /__dirname/g, /__filename/g, /module\s*\./g,
        ];
        for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.test(script)) {
                throw new Error('脚本包含禁止的操作');
            }
        }
        const context = {
            data: JSON.parse(JSON.stringify(data)),
            request: JSON.parse(JSON.stringify(requestData)),
            Math,
            Date,
            String,
            Number,
            Boolean,
            Array,
            Object,
            JSON,
            console: {
                log: (...args) => console.log('[Script]', ...args),
                warn: (...args) => console.warn('[Script]', ...args),
                error: (...args) => console.error('[Script]', ...args),
            },
        };
        const wrapperScript = `
      "use strict";
      const { ${Object.keys(context).join(', ')} } = sandbox;
      try {
        ${script}
      } catch (e) {
        throw new Error('脚本执行错误: ' + e.message);
      }
    `;
        const executor = new Function('sandbox', wrapperScript);
        const result = executor(context);
        return result !== undefined ? result : data;
    }
    logRequest(log) {
        this.requestLogs.unshift(log);
        if (this.requestLogs.length > 1000) {
            this.requestLogs = this.requestLogs.slice(0, 1000);
        }
    }
    getRequestLogs(apiId, limit = 100) {
        if (apiId) {
            return this.requestLogs.filter(l => l.apiId === apiId).slice(0, limit);
        }
        return this.requestLogs.slice(0, limit);
    }
    getStatistics() {
        const apis = this.storageService.read('gateway-apis');
        const activeCount = apis.filter(a => a.status === 'active').length;
        const totalRequests = this.requestLogs.length;
        const successCount = this.requestLogs.filter(l => l.statusCode >= 200 && l.statusCode < 300).length;
        const errorCount = totalRequests - successCount;
        const avgDuration = totalRequests > 0
            ? this.requestLogs.reduce((sum, l) => sum + l.duration, 0) / totalRequests
            : 0;
        return {
            totalApis: apis.length,
            activeApis: activeCount,
            totalRequests,
            successCount,
            errorCount,
            avgDuration: Math.round(avgDuration),
            dynamicRoutes: this.dynamicRoutes.size,
        };
    }
    getTopology() {
        const apis = this.storageService.read('gateway-apis');
        const nodes = [];
        const links = [];
        const serviceMap = new Map();
        nodes.push({
            id: 'gateway',
            name: 'API网关',
            type: 'gateway',
            category: 0,
        });
        for (const api of apis) {
            const apiNode = {
                id: api.id,
                name: api.name || api.path,
                type: 'api',
                category: 1,
                method: api.method,
                path: api.path,
                status: api.status,
            };
            nodes.push(apiNode);
            links.push({
                source: 'gateway',
                target: api.id,
            });
            if (api.flowNodes) {
                for (const node of api.flowNodes) {
                    if (node.type === 'http' && node.config?.url) {
                        try {
                            const parsedUrl = (0, url_1.parse)(node.config.url);
                            const serviceName = parsedUrl.hostname || 'unknown-service';
                            if (!serviceMap.has(serviceName)) {
                                serviceMap.set(serviceName, {
                                    id: `service_${serviceName}`,
                                    name: serviceName,
                                    type: 'service',
                                    category: 2,
                                });
                            }
                            links.push({
                                source: api.id,
                                target: serviceMap.get(serviceName).id,
                            });
                        }
                        catch { }
                    }
                }
            }
        }
        nodes.push(...serviceMap.values());
        const categories = [
            { name: '网关' },
            { name: '聚合API' },
            { name: '微服务' },
        ];
        return { nodes, links, categories };
    }
    getDynamicRoutes() {
        return Array.from(this.dynamicRoutes.values());
    }
    matchRoute(method, path) {
        for (const api of this.dynamicRoutes.values()) {
            if (api.method === method && this.pathMatches(api.path, path)) {
                return api;
            }
        }
        return null;
    }
    pathMatches(pattern, actual) {
        const patternParts = pattern.split('/').filter(Boolean);
        const actualParts = actual.split('/').filter(Boolean);
        if (patternParts.length !== actualParts.length)
            return false;
        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':'))
                continue;
            if (patternParts[i] !== actualParts[i])
                return false;
        }
        return true;
    }
    extractPathParams(pattern, actual) {
        const params = {};
        const patternParts = pattern.split('/').filter(Boolean);
        const actualParts = actual.split('/').filter(Boolean);
        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                const key = patternParts[i].slice(1);
                params[key] = actualParts[i];
            }
        }
        return params;
    }
};
exports.GatewayService = GatewayService;
exports.GatewayService = GatewayService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [json_storage_service_1.JsonStorageService])
], GatewayService);
