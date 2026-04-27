"use strict";
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
exports.DynamicRouteMiddleware = void 0;
const common_1 = require("@nestjs/common");
const gateway_service_1 = require("./gateway.service");
let DynamicRouteMiddleware = class DynamicRouteMiddleware {
    gatewayService;
    constructor(gatewayService) {
        this.gatewayService = gatewayService;
    }
    use(req, res, next) {
        const method = req.method.toUpperCase();
        const path = req.path;
        if (path.startsWith('/api/gateway/')) {
            next();
            return;
        }
        if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            next();
            return;
        }
        const api = this.gatewayService.matchRoute(method, path);
        if (!api) {
            next();
            return;
        }
        this.handleDynamicRoute(api, req, res);
    }
    async handleDynamicRoute(api, req, res) {
        try {
            const pathParams = this.gatewayService.extractPathParams(api.path, req.path);
            const queryParams = req.query || {};
            const bodyData = req.body || {};
            const requestData = {
                ...pathParams,
                ...queryParams,
                ...bodyData,
                _path: pathParams,
                _query: queryParams,
                _body: bodyData,
                _headers: req.headers,
                _method: req.method,
                _pathname: req.path,
            };
            const result = await this.gatewayService.executeApi(api.id, requestData);
            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[DynamicRoute] 执行失败:', error.message);
            const statusCode = error.status || 500;
            res.status(statusCode).json({
                success: false,
                error: error.message || '内部服务器错误',
                statusCode,
                timestamp: new Date().toISOString(),
            });
        }
    }
};
exports.DynamicRouteMiddleware = DynamicRouteMiddleware;
exports.DynamicRouteMiddleware = DynamicRouteMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gateway_service_1.GatewayService])
], DynamicRouteMiddleware);
