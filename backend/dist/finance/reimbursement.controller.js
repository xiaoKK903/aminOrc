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
exports.ReimbursementController = void 0;
const common_1 = require("@nestjs/common");
const reimbursement_service_1 = require("./reimbursement.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let ReimbursementController = class ReimbursementController {
    reimbursementService;
    constructor(reimbursementService) {
        this.reimbursementService = reimbursementService;
    }
    create(createDto, req) {
        return this.reimbursementService.create(createDto, req.user.id);
    }
    findAll(req, status, budgetId, page, pageSize) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
        return this.reimbursementService.findAll(req.user.id, req.user.role, status, budgetId, pageNum, pageSizeNum);
    }
    getStatistics(req) {
        return this.reimbursementService.getStatistics();
    }
    findOne(id) {
        return this.reimbursementService.findOne(id);
    }
    update(id, updateDto, req) {
        return this.reimbursementService.update(id, updateDto, req.user.id);
    }
    submit(id, req) {
        return this.reimbursementService.submit(id, req.user.id);
    }
    approve(id, approveDto, req) {
        return this.reimbursementService.approve(id, req.user.id, approveDto.step, approveDto.comment);
    }
    reject(id, rejectDto, req) {
        return this.reimbursementService.reject(id, req.user.id, rejectDto.step, rejectDto.comment);
    }
    cancel(id, req) {
        return this.reimbursementService.cancel(id, req.user.id);
    }
    getHistory(id) {
        return this.reimbursementService.getHistory(id);
    }
    generateMock(count, req) {
        const generatedCount = this.reimbursementService.generateMockData(count || 10, req.user.id);
        return { message: `成功生成 ${generatedCount} 条测试数据` };
    }
    clearMock(req) {
        const result = this.reimbursementService.clearMockData(req.user.id);
        return { message: `成功清空 ${result.reimbursementsCount} 条报销数据和 ${result.historiesCount} 条历史记录` };
    }
};
exports.ReimbursementController = ReimbursementController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('reimbursement:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('reimbursement:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('budgetId')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, permissions_decorator_1.RequirePermissions)('reimbursement:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('reimbursement:read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('reimbursement:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, permissions_decorator_1.RequirePermissions)('reimbursement:submit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, permissions_decorator_1.RequirePermissions)('reimbursement:approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, permissions_decorator_1.RequirePermissions)('reimbursement:approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_decorator_1.RequirePermissions)('reimbursement:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)(':id/history'),
    (0, permissions_decorator_1.RequirePermissions)('reimbursement:read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('mock/generate'),
    __param(0, (0, common_1.Body)('count')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "generateMock", null);
__decorate([
    (0, common_1.Delete)('mock/clear'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReimbursementController.prototype, "clearMock", null);
exports.ReimbursementController = ReimbursementController = __decorate([
    (0, common_1.Controller)('finance/reimbursements'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [reimbursement_service_1.ReimbursementService])
], ReimbursementController);
