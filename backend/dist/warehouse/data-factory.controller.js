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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataFactoryController = void 0;
const common_1 = require("@nestjs/common");
const data_factory_service_1 = require("./data-factory.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let DataFactoryController = class DataFactoryController {
    dataFactoryService;
    constructor(dataFactoryService) {
        this.dataFactoryService = dataFactoryService;
    }
    checkData(req) {
        const hasData = this.dataFactoryService.hasData();
        return {
            hasData,
            message: hasData ? '系统已有数据' : '系统暂无数据'
        };
    }
    generateAll(generateDto, req) {
        return this.dataFactoryService.generateAll(generateDto.warehouseCount || 5, generateDto.skuCount || 15, generateDto.orderCount || 20, req.user.id);
    }
    generateWarehouses(generateDto, req) {
        const count = this.dataFactoryService.generateWarehouses(generateDto.count || 5, req.user.id);
        return {
            success: true,
            message: `成功生成 ${count.length} 个仓库`,
            count: count.length
        };
    }
    generateSkus(generateDto, req) {
        const count = this.dataFactoryService.generateSkus(generateDto.count || 15, req.user.id);
        return {
            success: true,
            message: `成功生成 ${count.length} 个SKU`,
            count: count.length
        };
    }
    clearAll(req) {
        return this.dataFactoryService.clearAll();
    }
};
exports.DataFactoryController = DataFactoryController;
__decorate([
    (0, common_1.Get)('check'),
    (0, permissions_decorator_1.RequirePermissions)('warehouse:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DataFactoryController.prototype, "checkData", null);
__decorate([
    (0, common_1.Post)('generate-all'),
    (0, permissions_decorator_1.RequirePermissions)('warehouse:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DataFactoryController.prototype, "generateAll", null);
__decorate([
    (0, common_1.Post)('generate-warehouses'),
    (0, permissions_decorator_1.RequirePermissions)('warehouse:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DataFactoryController.prototype, "generateWarehouses", null);
__decorate([
    (0, common_1.Post)('generate-skus'),
    (0, permissions_decorator_1.RequirePermissions)('warehouse:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DataFactoryController.prototype, "generateSkus", null);
__decorate([
    (0, common_1.Post)('clear-all'),
    (0, permissions_decorator_1.RequirePermissions)('warehouse:delete'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DataFactoryController.prototype, "clearAll", null);
exports.DataFactoryController = DataFactoryController = __decorate([
    (0, common_1.Controller)('warehouse/data-factory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [data_factory_service_1.DataFactoryService])
], DataFactoryController);
