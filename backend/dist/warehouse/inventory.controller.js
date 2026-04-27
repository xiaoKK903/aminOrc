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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let InventoryController = class InventoryController {
    inventoryService;
    skuService;
    constructor(inventoryService, skuService) {
        this.inventoryService = inventoryService;
        this.skuService = skuService;
    }
    getByWarehouse(warehouseId, req, page, pageSize, keyword) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
        return this.inventoryService.getInventoryByWarehouse(warehouseId, pageNum, pageSizeNum, keyword);
    }
    getBySku(skuId, req) {
        return this.inventoryService.getInventoryBySku(skuId);
    }
    getStatistics(req) {
        return this.inventoryService.getStatistics();
    }
    getDashboardStats(req) {
        return this.inventoryService.getDashboardStats();
    }
    lock(lockDto, req) {
        return this.inventoryService.lock(lockDto.warehouseId, lockDto.skuId, lockDto.quantity, 'manual_lock', req.user.id, lockDto.remark || '手动锁定');
    }
    release(releaseDto, req) {
        return this.inventoryService.release(releaseDto.warehouseId, releaseDto.skuId, releaseDto.quantity, 'manual_release', req.user.id, releaseDto.remark || '手动释放');
    }
    addInventory(addDto, req) {
        return this.skuService.addInventory(addDto.warehouseId, addDto.skuId, addDto.quantity, addDto.costPrice || 0);
    }
    getLogs(req, warehouseId, skuId, type, sourceType, page, pageSize) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
        return this.inventoryService.getLogs(warehouseId, skuId, type, sourceType, pageNum, pageSizeNum);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('warehouse/:warehouseId'),
    (0, permissions_decorator_1.RequirePermissions)('inventory:read'),
    __param(0, (0, common_1.Param)('warehouseId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __param(4, (0, common_1.Query)('keyword')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getByWarehouse", null);
__decorate([
    (0, common_1.Get)('sku/:skuId'),
    (0, permissions_decorator_1.RequirePermissions)('inventory:read'),
    __param(0, (0, common_1.Param)('skuId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getBySku", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, permissions_decorator_1.RequirePermissions)('inventory:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, permissions_decorator_1.RequirePermissions)('inventory:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Post)('lock'),
    (0, permissions_decorator_1.RequirePermissions)('inventory:update'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "lock", null);
__decorate([
    (0, common_1.Post)('release'),
    (0, permissions_decorator_1.RequirePermissions)('inventory:update'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "release", null);
__decorate([
    (0, common_1.Post)('add'),
    (0, permissions_decorator_1.RequirePermissions)('inventory:update'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "addInventory", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, permissions_decorator_1.RequirePermissions)('inventory:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('warehouseId')),
    __param(2, (0, common_1.Query)('skuId')),
    __param(3, (0, common_1.Query)('type')),
    __param(4, (0, common_1.Query)('sourceType')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getLogs", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('warehouse/inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [Object, Object])
], InventoryController);
