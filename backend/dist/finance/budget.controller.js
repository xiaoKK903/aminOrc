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
exports.BudgetController = void 0;
const common_1 = require("@nestjs/common");
const budget_service_1 = require("./budget.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let BudgetController = class BudgetController {
    budgetService;
    constructor(budgetService) {
        this.budgetService = budgetService;
    }
    create(createDto, req) {
        return this.budgetService.create(createDto, req.user.id);
    }
    findAll(req, level, parentId, page, pageSize) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
        if (parentId === 'tree') {
            return this.budgetService.getBudgetTree();
        }
        return this.budgetService.findAllPaginated(req.user.id, req.user.role, pageNum, pageSizeNum, level, parentId);
    }
    getTree(req) {
        return this.budgetService.getBudgetTree();
    }
    getStatistics(req) {
        return this.budgetService.getStatistics();
    }
    findOne(id) {
        return this.budgetService.findOne(id);
    }
    update(id, updateDto) {
        return this.budgetService.update(id, updateDto);
    }
    remove(id) {
        return this.budgetService.remove(id);
    }
    occupy(id, occupyDto) {
        return this.budgetService.occupy(id, occupyDto.amount, occupyDto.sourceId, occupyDto.sourceType, occupyDto.description);
    }
    release(id, releaseDto) {
        return this.budgetService.release(id, releaseDto.amount, releaseDto.sourceId, releaseDto.description);
    }
    deduct(id, deductDto) {
        return this.budgetService.deduct(id, deductDto.amount, deductDto.sourceId, deductDto.sourceType, deductDto.description);
    }
    rollback(id, rollbackDto) {
        return this.budgetService.rollback(id, rollbackDto.amount, rollbackDto.sourceId, rollbackDto.description);
    }
    getLogs(id, type, page, pageSize) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
        return this.budgetService.getLogs(id, type, pageNum, pageSizeNum);
    }
    generateMock(count, req) {
        const generatedCount = this.budgetService.generateMockData(count || 10, req.user.id);
        return { message: `成功生成 ${generatedCount} 条测试数据` };
    }
    clearMock(req) {
        const result = this.budgetService.clearMockData();
        return { message: `成功清空 ${result.budgetsCount} 条预算数据和 ${result.logsCount} 条日志` };
    }
};
exports.BudgetController = BudgetController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('budget:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('budget:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('level')),
    __param(2, (0, common_1.Query)('parentId')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('tree'),
    (0, permissions_decorator_1.RequirePermissions)('budget:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "getTree", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, permissions_decorator_1.RequirePermissions)('budget:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('budget:read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('budget:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('budget:delete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/occupy'),
    (0, permissions_decorator_1.RequirePermissions)('budget:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "occupy", null);
__decorate([
    (0, common_1.Post)(':id/release'),
    (0, permissions_decorator_1.RequirePermissions)('budget:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "release", null);
__decorate([
    (0, common_1.Post)(':id/deduct'),
    (0, permissions_decorator_1.RequirePermissions)('budget:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "deduct", null);
__decorate([
    (0, common_1.Post)(':id/rollback'),
    (0, permissions_decorator_1.RequirePermissions)('budget:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "rollback", null);
__decorate([
    (0, common_1.Get)(':id/logs'),
    (0, permissions_decorator_1.RequirePermissions)('budget:read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Post)('mock/generate'),
    __param(0, (0, common_1.Body)('count')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "generateMock", null);
__decorate([
    (0, common_1.Delete)('mock/clear'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BudgetController.prototype, "clearMock", null);
exports.BudgetController = BudgetController = __decorate([
    (0, common_1.Controller)('finance/budgets'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [budget_service_1.BudgetService])
], BudgetController);
