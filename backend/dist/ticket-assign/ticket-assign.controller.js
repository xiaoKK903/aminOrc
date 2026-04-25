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
exports.TicketAssignController = void 0;
const common_1 = require("@nestjs/common");
const ticket_assign_service_1 = require("./ticket-assign.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let TicketAssignController = class TicketAssignController {
    ticketAssignService;
    constructor(ticketAssignService) {
        this.ticketAssignService = ticketAssignService;
    }
    getChannels() {
        return this.ticketAssignService.getChannels();
    }
    getOwners(channel) {
        if (!channel) {
            return [];
        }
        return this.ticketAssignService.getOwnersByChannel(channel);
    }
    validate(body, req) {
        const { channel, ownerValue } = body;
        if (!channel) {
            throw new common_1.BadRequestException('请选择渠道');
        }
        if (!ownerValue) {
            throw new common_1.BadRequestException('请选择负责人');
        }
        const isValid = this.ticketAssignService.validateOwner(channel, ownerValue);
        if (!isValid) {
            throw new common_1.BadRequestException('负责人与渠道不匹配');
        }
        return { valid: true, message: '验证通过' };
    }
    assign(body, req) {
        const { channel, ownerValue, ownerName } = body;
        if (!channel) {
            throw new common_1.BadRequestException('请选择渠道');
        }
        if (!ownerValue) {
            throw new common_1.BadRequestException('请选择负责人');
        }
        const isValid = this.ticketAssignService.validateOwner(channel, ownerValue);
        if (!isValid) {
            throw new common_1.BadRequestException('负责人与渠道不匹配，请重新选择');
        }
        return this.ticketAssignService.assignTicket(
            channel,
            ownerValue,
            ownerName,
            req.user.id,
            req.user.name
        );
    }
    getTickets(req) {
        return this.ticketAssignService.getTickets(req.user.id, req.user.role);
    }
};
exports.TicketAssignController = TicketAssignController;
__decorate([
    (0, common_1.Get)('channels'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TicketAssignController.prototype, "getChannels", null);
__decorate([
    (0, common_1.Get)('owners'),
    __param(0, (0, common_1.Query)('channel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TicketAssignController.prototype, "getOwners", null);
__decorate([
    (0, common_1.Post)('validate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TicketAssignController.prototype, "validate", null);
__decorate([
    (0, common_1.Post)('assign'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TicketAssignController.prototype, "assign", null);
__decorate([
    (0, common_1.Get)('tickets'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TicketAssignController.prototype, "getTickets", null);
exports.TicketAssignController = TicketAssignController = __decorate([
    (0, common_1.Controller)('ticket-assign'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ticket_assign_service_1.TicketAssignService])
], TicketAssignController);
