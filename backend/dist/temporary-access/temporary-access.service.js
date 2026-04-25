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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemporaryAccessService = void 0;
const common_1 = require("@nestjs/common");
const json_storage_service_1 = require("../common/json-storage.service");
const uuid_1 = require("uuid");
let TemporaryAccessService = class TemporaryAccessService {
    storageService;
    constructor(storageService) {
        this.storageService = storageService;
    }
    calculateStatus(access) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(access.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(access.endDate);
        endDate.setHours(23, 59, 59, 999);
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (today < startDate) {
            return 'pending';
        }
        if (today > endDate) {
            return 'expired';
        }
        if (diffDays <= 3) {
            return 'expiring';
        }
        return 'active';
    }
    formatAccess(access) {
        return {
            ...access,
            status: this.calculateStatus(access),
        };
    }
    create(createTemporaryAccessDto, userId, userName) {
        const access = {
            id: (0, uuid_1.v4)(),
            ...createTemporaryAccessDto,
            createdBy: userId,
            createdByName: userName || createTemporaryAccessDto.approvedBy || '未知',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.storageService.create('temporary-access', access);
        return this.formatAccess(access);
    }
    findAll(userId, userRole, filters = {}) {
        let accesses = this.storageService.read('temporary-access');
        if (filters.status) {
            accesses = accesses.filter(a => {
                const status = this.calculateStatus(a);
                if (filters.status === 'active-now') {
                    return status === 'active' || status === 'expiring';
                }
                return status === filters.status;
            });
        }
        if (filters.visitorName) {
            const keyword = filters.visitorName.toLowerCase();
            accesses = accesses.filter(a => 
                a.visitorName && a.visitorName.toLowerCase().includes(keyword)
            );
        }
        accesses.sort((a, b) => {
            const statusOrder = { 'expired': 0, 'pending': 1, 'expiring': 2, 'active': 3 };
            const statusA = this.calculateStatus(a);
            const statusB = this.calculateStatus(b);
            if (statusOrder[statusA] !== statusOrder[statusB]) {
                return statusOrder[statusB] - statusOrder[statusA];
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        return accesses.map(a => this.formatAccess(a));
    }
    findAllPaginated(userId, userRole, page = 1, pageSize = 10, filters = {}) {
        const accesses = this.findAll(userId, userRole, filters);
        return this.storageService.paginate(accesses, page, pageSize);
    }
    findOne(id, userId, userRole) {
        const access = this.storageService.findById('temporary-access', id);
        if (!access) {
            throw new common_1.NotFoundException('临时授权不存在');
        }
        return this.formatAccess(access);
    }
    remove(id, userId, userRole) {
        const access = this.storageService.findById('temporary-access', id);
        if (!access) {
            throw new common_1.NotFoundException('临时授权不存在');
        }
        const deleted = this.storageService.delete('temporary-access', id);
        if (!deleted) {
            throw new common_1.NotFoundException('删除失败');
        }
    }
    getStatistics() {
        const accesses = this.storageService.read('temporary-access');
        const stats = {
            total: accesses.length,
            active: 0,
            expiring: 0,
            expired: 0,
            pending: 0,
            activeNow: 0,
        };
        accesses.forEach(a => {
            const status = this.calculateStatus(a);
            stats[status]++;
            if (status === 'active' || status === 'expiring') {
                stats.activeNow++;
            }
        });
        return stats;
    }
};
exports.TemporaryAccessService = TemporaryAccessService;
exports.TemporaryAccessService = TemporaryAccessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [json_storage_service_1.JsonStorageService])
], TemporaryAccessService);
