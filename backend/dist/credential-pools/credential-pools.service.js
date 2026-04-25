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
exports.CredentialPoolsService = void 0;
const common_1 = require("@nestjs/common");
const json_storage_service_1 = require("../common/json-storage.service");
const uuid_1 = require("uuid");
let CredentialPoolsService = class CredentialPoolsService {
    storageService;
    constructor(storageService) {
        this.storageService = storageService;
    }
    calculateStatus(credential) {
        if (!credential.expireDate) {
            return 'normal';
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expireDate = new Date(credential.expireDate);
        expireDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expireDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            return 'expired';
        }
        if (diffDays <= 7) {
            return 'warning';
        }
        return 'normal';
    }
    maskSecret(secret) {
        if (!secret) {
            return '';
        }
        if (secret.length <= 4) {
            return '****';
        }
        return secret.substring(0, 2) + '****' + secret.substring(secret.length - 2);
    }
    formatCredential(credential) {
        return {
            ...credential,
            status: this.calculateStatus(credential),
            maskedSecret: this.maskSecret(credential.secret),
        };
    }
    create(createCredentialPoolDto, userId) {
        const credential = {
            id: (0, uuid_1.v4)(),
            ...createCredentialPoolDto,
            ownerId: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.storageService.create('credential-pools', credential);
        return this.formatCredential(credential);
    }
    findAll(userId, userRole) {
        const credentials = this.storageService.read('credential-pools');
        let filteredCredentials = credentials;
        if (userRole !== 'admin') {
            filteredCredentials = credentials.filter(c => c.ownerId === userId);
        }
        return filteredCredentials.map(c => this.formatCredential(c));
    }
    findAllPaginated(userId, userRole, page = 1, pageSize = 10, filters = {}) {
        let credentials = this.findAll(userId, userRole);
        if (filters.thirdParty) {
            credentials = credentials.filter(c => c.thirdParty === filters.thirdParty);
        }
        if (filters.status) {
            credentials = credentials.filter(c => c.status === filters.status);
        }
        credentials.sort((a, b) => {
            const statusOrder = { 'expired': 0, 'warning': 1, 'normal': 2 };
            return statusOrder[a.status] - statusOrder[b.status];
        });
        return this.storageService.paginate(credentials, page, pageSize);
    }
    findOne(id, userId, userRole) {
        const credential = this.storageService.findById('credential-pools', id);
        if (!credential) {
            throw new common_1.NotFoundException('凭证不存在');
        }
        if (userRole !== 'admin' && credential.ownerId !== userId) {
            throw new common_1.ForbiddenException('无权访问此凭证');
        }
        return this.formatCredential(credential);
    }
    getSecret(id, userId, userRole) {
        const credential = this.storageService.findById('credential-pools', id);
        if (!credential) {
            throw new common_1.NotFoundException('凭证不存在');
        }
        if (userRole !== 'admin' && credential.ownerId !== userId) {
            throw new common_1.ForbiddenException('无权访问此凭证');
        }
        return { secret: credential.secret };
    }
    update(id, updateCredentialPoolDto, userId, userRole) {
        const credential = this.storageService.findById('credential-pools', id);
        if (!credential) {
            throw new common_1.NotFoundException('凭证不存在');
        }
        if (userRole !== 'admin' && credential.ownerId !== userId) {
            throw new common_1.ForbiddenException('无权修改此凭证');
        }
        const updated = this.storageService.update('credential-pools', id, {
            ...updateCredentialPoolDto,
            updatedAt: new Date().toISOString(),
        });
        if (!updated) {
            throw new common_1.NotFoundException('更新失败');
        }
        return this.formatCredential(updated);
    }
    remove(id, userId, userRole) {
        const credential = this.storageService.findById('credential-pools', id);
        if (!credential) {
            throw new common_1.NotFoundException('凭证不存在');
        }
        if (userRole !== 'admin' && credential.ownerId !== userId) {
            throw new common_1.ForbiddenException('无权删除此凭证');
        }
        const deleted = this.storageService.delete('credential-pools', id);
        if (!deleted) {
            throw new common_1.NotFoundException('删除失败');
        }
    }
    getThirdParties() {
        const credentials = this.storageService.read('credential-pools');
        const thirdParties = [...new Set(credentials.map(c => c.thirdParty))];
        return thirdParties.filter(p => p);
    }
    getStatistics() {
        const credentials = this.storageService.read('credential-pools');
        const stats = {
            total: credentials.length,
            normal: 0,
            warning: 0,
            expired: 0,
            byThirdParty: {},
        };
        credentials.forEach(c => {
            const status = this.calculateStatus(c);
            stats[status]++;
            if (c.thirdParty) {
                stats.byThirdParty[c.thirdParty] = (stats.byThirdParty[c.thirdParty] || 0) + 1;
            }
        });
        return stats;
    }
};
exports.CredentialPoolsService = CredentialPoolsService;
exports.CredentialPoolsService = CredentialPoolsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [json_storage_service_1.JsonStorageService])
], CredentialPoolsService);
//# sourceMappingURL=credential-pools.service.js.map