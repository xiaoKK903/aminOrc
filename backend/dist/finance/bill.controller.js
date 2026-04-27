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
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillController = void 0;
const common_1 = require("@nestjs/common");
const bill_service_1 = require("./bill.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let BillController = class BillController {
    billService;
    constructor(billService) {
        this.billService = billService;
    }
    create(createDto, req) {
        return this.billService.create(createDto, req.user.id);
    }
    findAll(req, status, category, supplier, startDate, endDate, page, pageSize) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
        return this.billService.findAll(req.user.id, req.user.role, status, category, supplier, startDate, endDate, pageNum, pageSizeNum);
    }
    getStatistics(req) {
        return this.billService.getStatistics();
    }
    findOne(id) {
        return this.billService.findOne(id);
    }
    update(id, updateDto) {
        return this.billService.update(id, updateDto);
    }
    remove(id) {
        return this.billService.remove(id);
    }
    importFile(importDto, req) {
        return this.billService.importFromFile(importDto, req.user.id);
    }
    match(billId, matchDto, req) {
        return this.billService.matchWithReimbursement(billId, matchDto.reimbursementId, matchDto.amount, req.user.id);
    }
    unmatch(billId, unmatchDto, req) {
        return this.billService.unmatch(billId, unmatchDto.index, req.user.id);
    }
    markDifference(billId, differenceDto, req) {
        return this.billService.markDifference(billId, differenceDto, req.user.id);
    }
    reconcile(billId, req) {
        return this.billService.reconcile(billId, req.user.id);
    }
    getHistory(id) {
        return this.billService.getHistory(id);
    }
    generateMock(count, req) {
        const generatedCount = this.billService.generateMockData(count || 10, req.user.id);
        return { message: `成功生成 ${generatedCount} 条测试数据` };
    }
    clearMock(req) {
        const result = this.billService.clearMockData();
        return { message: `成功清空 ${result.billsCount} 条账单数据和 ${result.historiesCount} 条历史记录` };
    }
};
exports.BillController = BillController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('bill:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('bill:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('category')),
    __param(3, (0, common_1.Query)('supplier')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('page')),
    __param(7, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, permissions_decorator_1.RequirePermissions)('bill:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('bill:read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('bill:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('bill:delete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, permissions_decorator_1.RequirePermissions)('bill:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "importFile", null);
__decorate([
    (0, common_1.Post)(':id/match'),
    (0, permissions_decorator_1.RequirePermissions)('bill:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "match", null);
__decorate([
    (0, common_1.Post)(':id/unmatch'),
    (0, permissions_decorator_1.RequirePermissions)('bill:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "unmatch", null);
__decorate([
    (0, common_1.Post)(':id/difference'),
    (0, permissions_decorator_1.RequirePermissions)('bill:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "markDifference", null);
__decorate([
    (0, common_1.Post)(':id/reconcile'),
    (0, permissions_decorator_1.RequirePermissions)('bill:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "reconcile", null);
__decorate([
    (0, common_1.Get)(':id/history'),
    (0, permissions_decorator_1.RequirePermissions)('bill:read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('mock/generate'),
    __param(0, (0, common_1.Body)('count')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "generateMock", null);
__decorate([
    (0, common_1.Delete)('mock/clear'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillController.prototype, "clearMock", null);
exports.BillController = BillController = __decorate([
    (0, common_1.Controller)('finance/bills'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [bill_service_1.BillService])
], BillController);
