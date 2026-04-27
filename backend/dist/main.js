"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const path_1 = require("path");
const common_1 = require("@nestjs/common");
const gateway_service_1 = require("./gateway/gateway.service");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe());
    app.setGlobalPrefix('api');
    app.useStaticAssets((0, path_1.join)(__dirname, '..', '..', 'uploads'), {
        prefix: '/uploads/',
    });
    const gatewayService = app.get(gateway_service_1.GatewayService);
    setupDynamicRoutes(app, gatewayService);
    const port = process.env.PORT ?? 3005;
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`[Gateway] 动态路由中间件已启用`);
}
function setupDynamicRoutes(app, gatewayService) {
    const httpAdapter = app.getHttpAdapter();
    const originalUse = httpAdapter.use.bind(httpAdapter);
    httpAdapter.use((req, res, next) => {
        let path = req.path;
        if (path.startsWith('/api/')) {
            path = path.substring(4);
        }
        const method = req.method.toUpperCase();
        if (path.startsWith('/gateway/')) {
            next();
            return;
        }
        if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            next();
            return;
        }
        const api = gatewayService.matchRoute(method, path);
        if (!api) {
            next();
            return;
        }
        handleDynamicRoute(gatewayService, api, req, res);
    });
}
async function handleDynamicRoute(gatewayService, api, req, res) {
    try {
        let path = req.path;
        if (path.startsWith('/api/')) {
            path = path.substring(4);
        }
        const pathParams = gatewayService.extractPathParams(api.path, path);
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
            _pathname: path,
        };
        const result = await gatewayService.executeApi(api.id, requestData);
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
bootstrap();
//# sourceMappingURL=main.js.map