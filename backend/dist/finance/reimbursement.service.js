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
const BUDGET_LEVELS = {
    GROUP: 'group',
    COMPANY: 'company',
    PROJECT: 'project'
};
let ReimbursementService = class ReimbursementService {
    storageService;
    constructor(storageService) {
        this.storageService = storageService;
    }
    getBudgetById(id) {
        const budget = this.storageService.findById('budgets', id);
        if (!budget) {
            throw new common_1.NotFoundException('预算不存在');
        }
        return budget;
    }
    updateBudget(budgetId, updates) {
        return this.storageService.update('budgets', budgetId, updates);
    }
    createBudgetLog(log) {
        this.storageService.create('budget-logs', log);
    }
    checkFeeControlRules(reimbursement, budget) {
        const rules = this.storageService.read('fee-control-rules').filter(r => r.enabled);
        for (const rule of rules) {
            try {
                const passed = this.evaluateRule(rule, reimbursement, budget);
                if (!passed) {
                    return { passed: false, blockingRule: rule };
                }
            }
            catch (e) {
                console.error('[FeeControl] 规则执行错误:', e.message);
            }
        }
        return { passed: true };
    }
    evaluateRule(rule, data, budget) {
        const FORBIDDEN_PATTERNS = [
            /document\s*\./g, /window\s*\./g, /eval\s*\(/g,
            /new\s+Function/g, /setTimeout\s*\(/g, /setInterval\s*\(/g,
            /fetch\s*\(/g, /XMLHttpRequest/g, /localStorage/g,
            /indexedDB/g, /process\s*\./g, /require\s*\(/g,
            /__dirname/g, /__filename/g, /module\s*\./g,
        ];
        if (rule.condition) {
            for (const pattern of FORBIDDEN_PATTERNS) {
                if (pattern.test(rule.condition)) {
                    throw new Error('脚本包含禁止的操作');
                }
            }
            const context = {
                data: JSON.parse(JSON.stringify(data)),
                budget: JSON.parse(JSON.stringify(budget)),
                Math,
                Date,
                String,
                Number,
                Boolean,
                Array,
                Object,
                JSON,
            };
            const wrapperScript = `
        "use strict";
        const { ${Object.keys(context).join(', ')} } = sandbox;
        try {
          return ${rule.condition};
        } catch (e) {
          throw new Error('脚本执行错误: ' + e.message);
        }
      `;
            const executor = new Function('sandbox', wrapperScript);
            return !executor(context);
        }
        return true;
    }
    occupyBudget(budgetId, amount, sourceId, sourceType, description) {
        const budget = this.getBudgetById(budgetId);
        const occupyAmount = parseFloat(amount.toString());
        if (budget.remainingAmount < occupyAmount) {
            throw new common_1.BadRequestException(`预算不足，剩余: ${budget.remainingAmount}, 需要: ${occupyAmount}`);
        }
        const now = new Date().toISOString();
        const log = {
            id: (0, uuid_1.v4)(),
            budgetId,
            type: 'occupy',
            amount: occupyAmount,
            sourceId,
            sourceType,
            description: description || '预算占用',
            beforeAmount: budget.remainingAmount,
            afterAmount: budget.remainingAmount - occupyAmount,
            createdAt: now,
        };
        this.createBudgetLog(log);
        budget.occupiedAmount += occupyAmount;
        budget.remainingAmount = budget.amount - budget.usedAmount - budget.occupiedAmount;
        budget.updatedAt = now;
        this.updateBudget(budgetId, {
            occupiedAmount: budget.occupiedAmount,
            remainingAmount: budget.remainingAmount,
            updatedAt: now
        });
        return { success: true, log, budget };
    }
    releaseBudget(budgetId, amount, sourceId, description) {
        const budget = this.getBudgetById(budgetId);
        const releaseAmount = parseFloat(amount.toString());
        if (budget.occupiedAmount < releaseAmount) {
            throw new common_1.BadRequestException(`已占用金额不足，已占用: ${budget.occupiedAmount}, 需要释放: ${releaseAmount}`);
        }
        const now = new Date().toISOString();
        const log = {
            id: (0, uuid_1.v4)(),
            budgetId,
            type: 'release',
            amount: releaseAmount,
            sourceId,
            sourceType: 'reimbursement',
            description: description || '预算释放回滚',
            beforeAmount: budget.remainingAmount,
            afterAmount: budget.remainingAmount + releaseAmount,
            createdAt: now,
        };
        this.createBudgetLog(log);
        budget.occupiedAmount -= releaseAmount;
        budget.remainingAmount = budget.amount - budget.usedAmount - budget.occupiedAmount;
        budget.updatedAt = now;
        this.updateBudget(budgetId, {
            occupiedAmount: budget.occupiedAmount,
            remainingAmount: budget.remainingAmount,
            updatedAt: now
        });
        return { success: true, log, budget };
    }
    deductBudget(budgetId, amount, sourceId, sourceType, description) {
        const budget = this.getBudgetById(budgetId);
        const deductAmount = parseFloat(amount.toString());
        const totalAvailable = budget.remainingAmount + budget.occupiedAmount;
        if (totalAvailable < deductAmount) {
            throw new common_1.BadRequestException(`可用预算不足，可用: ${totalAvailable}, 需要: ${deductAmount}`);
        }
        const now = new Date().toISOString();
        let releaseFromOccupied = 0;
        if (budget.occupiedAmount > 0) {
            releaseFromOccupied = Math.min(budget.occupiedAmount, deductAmount);
            budget.occupiedAmount -= releaseFromOccupied;
        }
        const remainingDeduct = deductAmount - releaseFromOccupied;
        if (remainingDeduct > 0) {
            budget.remainingAmount -= remainingDeduct;
        }
        budget.usedAmount += deductAmount;
        budget.updatedAt = now;
        const log = {
            id: (0, uuid_1.v4)(),
            budgetId,
            type: 'deduct',
            amount: deductAmount,
            sourceId,
            sourceType,
            description: description || '预算扣减',
            beforeAmount: budget.remainingAmount + budget.occupiedAmount + deductAmount,
            afterAmount: budget.remainingAmount + budget.occupiedAmount,
            createdAt: now,
        };
        this.createBudgetLog(log);
        this.updateBudget(budgetId, {
            usedAmount: budget.usedAmount,
            occupiedAmount: budget.occupiedAmount,
            remainingAmount: budget.remainingAmount,
            updatedAt: now
        });
        return { success: true, log, budget };
    }
    create(createDto, userId) {
        const { title, amount, description, budgetId, category, expenseDate, invoiceNumber, invoiceAmount, attachments, items } = createDto;
        if (!budgetId) {
            throw new common_1.BadRequestException('请选择关联的预算');
        }
        const budget = this.getBudgetById(budgetId);
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
        const budget = this.getBudgetById(reimbursement.budgetId);
        const checkResult = this.checkFeeControlRules(reimbursement, budget);
        if (!checkResult.passed) {
            throw new common_1.BadRequestException(`费控规则拦截: ${checkResult.blockingRule?.message || '不满足报销条件'}`);
        }
        this.occupyBudget(reimbursement.budgetId, reimbursement.amount, id, 'reimbursement', `报销单占用: ${reimbursement.title}`);
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
            this.releaseBudget(reimbursement.budgetId, reimbursement.amount, id, '报销单支付，释放占用');
            this.deductBudget(reimbursement.budgetId, reimbursement.amount, id, 'reimbursement', `报销单扣减: ${reimbursement.title}`);
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
            this.releaseBudget(reimbursement.budgetId, reimbursement.amount, id, '报销单被拒，释放占用');
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
            this.releaseBudget(reimbursement.budgetId, reimbursement.amount, id, '报销单撤销，释放占用');
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
        const budgets = this.storageService.read('budgets');
        for (let i = 0; i < count; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const amount = Math.floor(Math.random() * 5000) + 100;
            const statuses = Object.values(REIMBURSEMENT_STATUSES);
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const budgetId = budgets.length > 0 ? budgets[Math.floor(Math.random() * budgets.length)].id : null;
            const reimbursement = {
                id: (0, uuid_1.v4)(),
                title: titles[i % titles.length] + ` (测试数据 ${i + 1})`,
                amount,
                description: `这是一条测试数据，模拟${category}报销`,
                budgetId,
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
    __metadata("design:paramtypes", [json_storage_service_1.JsonStorageService])
], ReimbursementService);
