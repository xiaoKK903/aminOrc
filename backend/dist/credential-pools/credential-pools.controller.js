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
exports.CredentialPoolsController = void 0;
const common_1 = require("@nestjs/common");
const credential_pools_service_1 = require("./credential-pools.service");
const credential_pool_dto_1 = require("./dto/credential-pool.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
let CredentialPoolsController = class CredentialPoolsController {
    credentialPoolsService;
    constructor(credentialPoolsService) {
        this.credentialPoolsService = credentialPoolsService;
    }
    create(createCredentialPoolDto, req) {
        return this.credentialPoolsService.create(createCredentialPoolDto, req.user.id);
    }
    findAll(req, thirdParty, status, page, pageSize) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
        return this.credentialPoolsService.findAllPaginated(
            req.user.id,
            req.user.role,
            pageNum,
            pageSizeNum,
            { thirdParty, status }
        );
    }
    findOne(id, req) {
        return this.credentialPoolsService.findOne(id, req.user.id, req.user.role);
    }
    getSecret(id, req) {
        return this.credentialPoolsService.getSecret(id, req.user.id, req.user.role);
    }
    update(id, updateCredentialPoolDto, req) {
        return this.credentialPoolsService.update(id, updateCredentialPoolDto, req.user.id, req.user.role);
    }
    remove(id, req) {
        this.credentialPoolsService.remove(id, req.user.id, req.user.role);
        return { message: '删除成功' };
    }
    getThirdParties() {
        return this.credentialPoolsService.getThirdParties();
    }
    getStatistics() {
        return this.credentialPoolsService.getStatistics();
    }
};
exports.CredentialPoolsController = CredentialPoolsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [credential_pool_dto_1.CreateCredentialPoolDto, Object]),
    __metadata("design:returntype", void 0)
], CredentialPoolsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('thirdParty')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CredentialPoolsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CredentialPoolsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/secret'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CredentialPoolsController.prototype, "getSecret", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, credential_pool_dto_1.UpdateCredentialPoolDto, Object]),
    __metadata("design:returntype", void 0)
], CredentialPoolsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CredentialPoolsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('third-parties/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CredentialPoolsController.prototype, "getThirdParties", null);
__decorate([
    (0, common_1.Get)('statistics/overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CredentialPoolsController.prototype, "getStatistics", null);
exports.CredentialPoolsController = CredentialPoolsController = __decorate([
    (0, common_1.Controller)('credential-pools'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [credential_pools_service_1.CredentialPoolsService])
], CredentialPoolsController);
//# sourceMappingURL=credential-pools.controller.js.map