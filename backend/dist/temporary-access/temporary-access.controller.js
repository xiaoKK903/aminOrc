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
exports.TemporaryAccessController = void 0;
const common_1 = require("@nestjs/common");
const temporary_access_service_1 = require("./temporary-access.service");
const temporary_access_dto_1 = require("./dto/temporary-access.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let TemporaryAccessController = class TemporaryAccessController {
    temporaryAccessService;
    constructor(temporaryAccessService) {
        this.temporaryAccessService = temporaryAccessService;
    }
    create(createTemporaryAccessDto, req) {
        return this.temporaryAccessService.create(
            createTemporaryAccessDto,
            req.user.id,
            req.user.name
        );
    }
    findAll(req, status, visitorName, page, pageSize) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
        return this.temporaryAccessService.findAllPaginated(
            req.user.id,
            req.user.role,
            pageNum,
            pageSizeNum,
            { status, visitorName }
        );
    }
    findOne(id, req) {
        return this.temporaryAccessService.findOne(id, req.user.id, req.user.role);
    }
    remove(id, req) {
        this.temporaryAccessService.remove(id, req.user.id, req.user.role);
        return { message: '删除成功' };
    }
    getStatistics() {
        return this.temporaryAccessService.getStatistics();
    }
};
exports.TemporaryAccessController = TemporaryAccessController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [temporary_access_dto_1.CreateTemporaryAccessDto, Object]),
    __metadata("design:returntype", void 0)
], TemporaryAccessController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('visitorName')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], TemporaryAccessController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TemporaryAccessController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TemporaryAccessController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('statistics/overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TemporaryAccessController.prototype, "getStatistics", null);
exports.TemporaryAccessController = TemporaryAccessController = __decorate([
    (0, common_1.Controller)('temporary-access'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [temporary_access_service_1.TemporaryAccessService])
], TemporaryAccessController);
