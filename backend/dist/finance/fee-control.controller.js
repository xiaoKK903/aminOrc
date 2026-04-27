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
exports.FeeControlController = void 0;
const common_1 = require("@nestjs/common");
const fee_control_service_1 = require("./fee-control.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let FeeControlController = class FeeControlController {
    feeControlService;
    constructor(feeControlService) {
        this.feeControlService = feeControlService;
    }
    create(createDto, req) {
        const validation = this.feeControlService.validateScript(createDto.conditionScript);
        if (!validation.valid) {
            throw new common_1.BadRequestException(validation.error);
        }
        return this.feeControlService.create(createDto, req.user.id);
    }
    findAll(req, status, ruleType, budgetId, page, pageSize) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
        return this.feeControlService.findAllPaginated(req.user.id, req.user.role, pageNum, pageSizeNum, status, ruleType, budgetId);
    }
    getStatistics(req) {
        return this.feeControlService.getStatistics();
    }
    findOne(id) {
        return this.feeControlService.findOne(id);
    }
    update(id, updateDto) {
        if (updateDto.conditionScript) {
            const validation = this.feeControlService.validateScript(updateDto.conditionScript);
            if (!validation.valid) {
                throw new common_1.BadRequestException(validation.error);
            }
        }
        return this.feeControlService.update(id, updateDto);
    }
    remove(id) {
        return this.feeControlService.remove(id);
    }
    activate(id) {
        return this.feeControlService.activate(id);
    }
    deactivate(id) {
        return this.feeControlService.deactivate(id);
    }
    validateScript(scriptDto) {
        return this.feeControlService.validateScript(scriptDto.script);
    }
    checkReimbursement(checkDto) {
        return this.feeControlService.checkReimbursement(checkDto.reimbursement, checkDto.budget);
    }
    getLogs(reimbursementId, budgetId, page, pageSize) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
        return this.feeControlService.getLogs(reimbursementId, budgetId, pageNum, pageSizeNum);
    }
    generateMock(count, req) {
        const generatedCount = this.feeControlService.generateMockData(count || 5, req.user.id);
        return { message: `成功生成 ${generatedCount} 条测试数据` };
    }
    clearMock(req) {
        const result = this.feeControlService.clearMockData();
        return { message: `成功清空 ${result.rulesCount} 条规则数据和 ${result.logsCount} 条日志` };
    }
};
exports.FeeControlController = FeeControlController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('fee-control:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('fee-control:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('ruleType')),
    __param(3, (0, common_1.Query)('budgetId')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, permissions_decorator_1.RequirePermissions)('fee-control:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('fee-control:read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('fee-control:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('fee-control:delete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/activate'),
    (0, permissions_decorator_1.RequirePermissions)('fee-control:update'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)(':id/deactivate'),
    (0, permissions_decorator_1.RequirePermissions)('fee-control:update'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Post)('validate-script'),
    (0, permissions_decorator_1.RequirePermissions)('fee-control:read'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "validateScript", null);
__decorate([
    (0, common_1.Post)('check-reimbursement'),
    (0, permissions_decorator_1.RequirePermissions)('fee-control:read'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "checkReimbursement", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, permissions_decorator_1.RequirePermissions)('fee-control:read'),
    __param(0, (0, common_1.Query)('reimbursementId')),
    __param(1, (0, common_1.Query)('budgetId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Post)('mock/generate'),
    __param(0, (0, common_1.Body)('count')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "generateMock", null);
__decorate([
    (0, common_1.Delete)('mock/clear'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeeControlController.prototype, "clearMock", null);
exports.FeeControlController = FeeControlController = __decorate([
    (0, common_1.Controller)('finance/fee-control'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [fee_control_service_1.FeeControlService])
], FeeControlController);
