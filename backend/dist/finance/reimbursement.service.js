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
exports.ReimbursementService = void 0;
const common_1 = require("@nestjs/common");
const json_storage_service_1 = require("../common/json-storage.service");
const uuid_1 = require("uuid");
const REIMBURSEMENT_STATUSES = {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    PAID: 'paid',
    CANCELLED: 'cancelled'
};
const APPROVAL_FLOW = {
    [REIMBURSEMENT_STATUSES.SUBMITTED]: 'pending_manager',
    [REIMBURSEMENT_STATUSES.APPROVED]: 'pending_finance',
    [REIMBURSEMENT_STATUSES.PAID]: 'completed'
};
let ReimbursementService = class ReimbursementService {
    storageService;
    budgetService;
    feeControlService;
    constructor(storageService, budgetService, feeControlService) {
        this.storageService = storageService;
        this.budgetService = budgetService;
        this.feeControlService = feeControlService;
    }
    create(createDto, userId) {
        const { title, amount, description, budgetId, category, expenseDate, invoiceNumber, invoiceAmount, attachments, items } = createDto;
        if (!budgetId) {
            throw new common_1.BadRequestException('请选择关联的预算');
        }
        const budget = this.budgetService.findOne(budgetId);
        const totalAmount = items && items.length > 0
            ? items.reduce((sum, item) => sum + (item.amount || 0), 0)
            : (amount || 0);
        if (totalAmount <= 0) {
            throw new common_1.BadRequestException('报销金额必须大于0');
        }
        if (totalAmount > budget.remainingAmount + budget.occupiedAmount) {
            throw new common_1.BadRequestException(`预算不足，可用金额: ${budget.remainingAmount + budget.occupiedAmount}`);
        }
        const reimbursement = {
            id: (0, uuid_1.v4)(),
            title,
            amount: totalAmount,
            description: description || '',
            budgetId,
            category: category || 'other',
            expenseDate: expenseDate || new Date().toISOString().split('T')[0],
            invoiceNumber: invoiceNumber || '',
            invoiceAmount: invoiceAmount || totalAmount,
            attachments: attachments || [],
            items: items || [],
            status: REIMBURSEMENT_STATUSES.DRAFT,
            approvalFlow: [],
            currentStep: null,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.storageService.create('reimbursements', reimbursement);
        return reimbursement;
    }
    findOne(id) {
        const reimbursement = this.storageService.findById('reimbursements', id);
        if (!reimbursement) {
            throw new common_1.NotFoundException('报销单不存在');
        }
        return reimbursement;
    }
    findAll(userId, userRole, status, budgetId, page = 1, pageSize = 10) {
        let reimbursements = this.storageService.read('reimbursements');
        if (userRole !== 'admin') {
            reimbursements = reimbursements.filter(r => r.createdBy === userId);
        }
        if (status) {
            reimbursements = reimbursements.filter(r => r.status === status);
        }
        if (budgetId) {
            reimbursements = reimbursements.filter(r => r.budgetId === budgetId);
        }
        reimbursements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return this.storageService.paginate(reimbursements, page, pageSize);
    }
    update(id, updateDto, userId) {
        const reimbursement = this.findOne(id);
        if (reimbursement.status !== REIMBURSEMENT_STATUSES.DRAFT) {
            throw new common_1.BadRequestException('只有草稿状态可以编辑');
        }
        if (reimbursement.createdBy !== userId && !this.isAdmin(userId)) {
            throw new common_1.ForbiddenException('无权编辑此报销单');
        }
        updateDto.updatedAt = new Date().toISOString();
        if (updateDto.items && updateDto.items.length > 0) {
            updateDto.amount = updateDto.items.reduce((sum, item) => sum + (item.amount || 0), 0);
        }
        const updated = this.storageService.update('reimbursements', id, updateDto);
        if (!updated) {
            throw new common_1.NotFoundException('更新失败');
        }
        return updated;
    }
    async submit(id, userId) {
        const reimbursement = this.findOne(id);
        if (reimbursement.status !== REIMBURSEMENT_STATUSES.DRAFT) {
            throw new common_1.BadRequestException('只有草稿状态可以提交');
        }
        if (reimbursement.createdBy !== userId && !this.isAdmin(userId)) {
            throw new common_1.ForbiddenException('无权提交此报销单');
        }
        const budget = this.budgetService.findOne(reimbursement.budgetId);
        const checkResult = this.feeControlService.checkReimbursement(reimbursement, budget);
        if (!checkResult.passed) {
            throw new common_1.BadRequestException(`费控规则拦截: ${checkResult.blockingRule?.message || '不满足报销条件'}`);
        }
        this.budgetService.occupy(reimbursement.budgetId, reimbursement.amount, id, 'reimbursement', `报销单占用: ${reimbursement.title}`);
        const approvalFlow = [
            { step: 1, name: '部门经理审批', status: 'pending', approver: null, approvedAt: null, comment: '' },
            { step: 2, name: '财务审批', status: 'pending', approver: null, approvedAt: null, comment: '' },
        ];
        const updated = this.storageService.update('reimbursements', id, {
            status: REIMBURSEMENT_STATUSES.SUBMITTED,
            approvalFlow,
            currentStep: 1,
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        this.addHistory(id, 'submit', userId, '报销单已提交，等待审批');
        return updated;
    }
    async approve(id, userId, step, comment) {
        const reimbursement = this.findOne(id);
        if (reimbursement.status === REIMBURSEMENT_STATUSES.APPROVED && step !== 2) {
            throw new common_1.BadRequestException('报销单已审批，等待财务确认');
        }
        if (reimbursement.status !== REIMBURSEMENT_STATUSES.SUBMITTED &&
            reimbursement.status !== REIMBURSEMENT_STATUSES.APPROVED) {
            throw new common_1.BadRequestException('报销单状态不正确');
        }
        const approvalFlow = [...(reimbursement.approvalFlow || [])];
        const currentStep = approvalFlow.find(s => s.step === step);
        if (!currentStep) {
            throw new common_1.BadRequestException('审批步骤不存在');
        }
        if (currentStep.status !== 'pending') {
            throw new common_1.BadRequestException('此步骤已处理');
        }
        currentStep.status = 'approved';
        currentStep.approver = userId;
        currentStep.approvedAt = new Date().toISOString();
        currentStep.comment = comment || '';
        let newStatus = reimbursement.status;
        if (step === 1) {
            newStatus = REIMBURSEMENT_STATUSES.APPROVED;
            this.addHistory(id, 'approve', userId, `部门经理审批通过: ${comment || ''}`);
        }
        else if (step === 2) {
            newStatus = REIMBURSEMENT_STATUSES.PAID;
            const budget = this.budgetService.findOne(reimbursement.budgetId);
            this.budgetService.release(reimbursement.budgetId, reimbursement.amount, id, '报销单支付，释放占用');
            this.budgetService.deduct(reimbursement.budgetId, reimbursement.amount, id, 'reimbursement', `报销单扣减: ${reimbursement.title}`);
            this.addHistory(id, 'pay', userId, `财务已支付: ${comment || ''}`);
        }
        const updated = this.storageService.update('reimbursements', id, {
            status: newStatus,
            approvalFlow,
            currentStep: step + 1,
            updatedAt: new Date().toISOString(),
        });
        return updated;
    }
    async reject(id, userId, step, comment) {
        const reimbursement = this.findOne(id);
        if (reimbursement.status !== REIMBURSEMENT_STATUSES.SUBMITTED &&
            reimbursement.status !== REIMBURSEMENT_STATUSES.APPROVED) {
            throw new common_1.BadRequestException('报销单状态不正确');
        }
        const approvalFlow = [...(reimbursement.approvalFlow || [])];
        const currentStep = approvalFlow.find(s => s.step === step);
        if (currentStep) {
            currentStep.status = 'rejected';
            currentStep.approver = userId;
            currentStep.approvedAt = new Date().toISOString();
            currentStep.comment = comment || '';
        }
        if (reimbursement.status === REIMBURSEMENT_STATUSES.SUBMITTED) {
            this.budgetService.release(reimbursement.budgetId, reimbursement.amount, id, '报销单被拒，释放占用');
        }
        const updated = this.storageService.update('reimbursements', id, {
            status: REIMBURSEMENT_STATUSES.REJECTED,
            approvalFlow,
            updatedAt: new Date().toISOString(),
        });
        this.addHistory(id, 'reject', userId, `报销单被拒: ${comment || ''}`);
        return updated;
    }
    async cancel(id, userId) {
        const reimbursement = this.findOne(id);
        if (reimbursement.status !== REIMBURSEMENT_STATUSES.DRAFT &&
            reimbursement.status !== REIMBURSEMENT_STATUSES.SUBMITTED) {
            throw new common_1.BadRequestException('只有草稿或已提交状态可以撤销');
        }
        if (reimbursement.createdBy !== userId && !this.isAdmin(userId)) {
            throw new common_1.ForbiddenException('无权撤销此报销单');
        }
        if (reimbursement.status === REIMBURSEMENT_STATUSES.SUBMITTED) {
            this.budgetService.release(reimbursement.budgetId, reimbursement.amount, id, '报销单撤销，释放占用');
        }
        const updated = this.storageService.update('reimbursements', id, {
            status: REIMBURSEMENT_STATUSES.CANCELLED,
            updatedAt: new Date().toISOString(),
        });
        this.addHistory(id, 'cancel', userId, '报销单已撤销');
        return updated;
    }
    addHistory(reimbursementId, action, userId, comment) {
        const history = {
            id: (0, uuid_1.v4)(),
            reimbursementId,
            action,
            userId,
            comment,
            createdAt: new Date().toISOString(),
        };
        this.storageService.create('reimbursement-history', history);
        return history;
    }
    getHistory(reimbursementId) {
        const histories = this.storageService.read('reimbursement-history')
            .filter(h => h.reimbursementId === reimbursementId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return histories;
    }
    getStatistics() {
        const reimbursements = this.storageService.read('reimbursements');
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const stats = {
            total: reimbursements.length,
            byStatus: {},
            totalAmount: 0,
            thisMonthAmount: 0,
            thisMonthCount: 0,
            categories: {},
        };
        reimbursements.forEach(r => {
            stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
            stats.totalAmount += r.amount || 0;
            if (new Date(r.createdAt) >= thisMonth) {
                stats.thisMonthAmount += r.amount || 0;
                stats.thisMonthCount++;
            }
            if (r.category) {
                stats.categories[r.category] = (stats.categories[r.category] || 0) + 1;
            }
        });
        return stats;
    }
    isAdmin(userId) {
        return false;
    }
    generateMockData(count, userId) {
        const categories = ['差旅费', '招待费', '办公用品', '通讯费', '交通费', '会议费', '培训费'];
        const titles = [
            '北京出差费用报销',
            '客户招待餐费',
            '办公设备采购',
            '本月通讯费用',
            '项目现场交通费',
            '季度总结会议费',
            '员工培训费用'
        ];
        for (let i = 0; i < count; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const amount = Math.floor(Math.random() * 5000) + 100;
            const statuses = Object.values(REIMBURSEMENT_STATUSES);
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const reimbursement = {
                id: (0, uuid_1.v4)(),
                title: titles[i % titles.length] + ` (测试数据 ${i + 1})`,
                amount,
                description: `这是一条测试数据，模拟${category}报销`,
                budgetId: null,
                category,
                expenseDate: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                invoiceNumber: `INV-${Date.now()}-${i}`,
                invoiceAmount: amount,
                attachments: [],
                items: [
                    { name: category, amount: amount, description: `${category}支出` }
                ],
                status,
                approvalFlow: [],
                currentStep: null,
                createdBy: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            this.storageService.create('reimbursements', reimbursement);
        }
        return count;
    }
    clearMockData(userId) {
        const reimbursements = this.storageService.read('reimbursements');
        const histories = this.storageService.read('reimbursement-history');
        this.storageService.write('reimbursements', []);
        this.storageService.write('reimbursement-history', []);
        return {
            reimbursementsCount: reimbursements.length,
            historiesCount: histories.length,
        };
    }
};
exports.ReimbursementService = ReimbursementService;
exports.ReimbursementService = ReimbursementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [json_storage_service_1.JsonStorageService, Object, Object])
], ReimbursementService);
