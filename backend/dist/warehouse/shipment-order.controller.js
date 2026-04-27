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
exports.ShipmentOrderController = void 0;
const common_1 = require("@nestjs/common");
const shipment_order_service_1 = require("./shipment-order.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let ShipmentOrderController = class ShipmentOrderController {
    shipmentOrderService;
    constructor(shipmentOrderService) {
        this.shipmentOrderService = shipmentOrderService;
    }
    create(createDto, req) {
        return this.shipmentOrderService.create(createDto, req.user.id);
    }
    findAll(req, page, pageSize, status, type, keyword) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
        return this.shipmentOrderService.findAllPaginated(pageNum, pageSizeNum, status, type, keyword);
    }
    getStatistics(req) {
        return this.shipmentOrderService.getStatistics();
    }
    findOne(id) {
        return this.shipmentOrderService.findOne(id);
    }
    allocate(id, req) {
        return this.shipmentOrderService.allocate(id);
    }
    ship(id, req) {
        return this.shipmentOrderService.ship(id, req.user.id);
    }
    cancel(id, req) {
        return this.shipmentOrderService.cancel(id, req.user.id);
    }
    findSources(skuId, targetCity, targetProvince, targetLongitude, targetLatitude, quantity, req) {
        return this.shipmentOrderService.findSourceWarehouses(skuId, targetCity || '', targetProvince || '', parseFloat(targetLongitude) || 0, parseFloat(targetLatitude) || 0, parseInt(quantity) || 1);
    }
    getTraceability(sourceId, sourceType, req) {
        return this.shipmentOrderService.getTraceability(sourceId, sourceType);
    }
};
exports.ShipmentOrderController = ShipmentOrderController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('shipment:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ShipmentOrderController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('shipment:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('type')),
    __param(5, (0, common_1.Query)('keyword')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ShipmentOrderController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, permissions_decorator_1.RequirePermissions)('shipment:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShipmentOrderController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('shipment:read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ShipmentOrderController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/allocate'),
    (0, permissions_decorator_1.RequirePermissions)('shipment:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ShipmentOrderController.prototype, "allocate", null);
__decorate([
    (0, common_1.Post)(':id/ship'),
    (0, permissions_decorator_1.RequirePermissions)('shipment:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ShipmentOrderController.prototype, "ship", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_decorator_1.RequirePermissions)('shipment:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ShipmentOrderController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)('sources/:skuId'),
    (0, permissions_decorator_1.RequirePermissions)('shipment:read'),
    __param(0, (0, common_1.Param)('skuId')),
    __param(1, (0, common_1.Query)('targetCity')),
    __param(2, (0, common_1.Query)('targetProvince')),
    __param(3, (0, common_1.Query)('targetLongitude')),
    __param(4, (0, common_1.Query)('targetLatitude')),
    __param(5, (0, common_1.Query)('quantity')),
    __param(6, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], ShipmentOrderController.prototype, "findSources", null);
__decorate([
    (0, common_1.Get)('traceability/:sourceId'),
    (0, permissions_decorator_1.RequirePermissions)('shipment:read'),
    __param(0, (0, common_1.Param)('sourceId')),
    __param(1, (0, common_1.Query)('sourceType')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ShipmentOrderController.prototype, "getTraceability", null);
exports.ShipmentOrderController = ShipmentOrderController = __decorate([
    (0, common_1.Controller)('warehouse/shipment-orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [shipment_order_service_1.ShipmentOrderService])
], ShipmentOrderController);
