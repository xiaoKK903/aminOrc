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
exports.BudgetService = void 0;
const common_1 = require("@nestjs/common");
const json_storage_service_1 = require("../common/json-storage.service");
const uuid_1 = require("uuid");
const BUDGET_LEVELS = {
    GROUP: 'group',
    COMPANY: 'company',
    PROJECT: 'project'
};
let BudgetService = class BudgetService {
    storageService;
    constructor(storageService) {
        this.storageService = storageService;
    }
    create(createBudgetDto, userId) {
        const { parentId, name, amount, level, description, periodType, periodYear, periodMonth, budgetCode } = createBudgetDto;
        let parentBudget = null;
        if (parentId) {
            parentBudget = this.findOne(parentId);
            if (!parentBudget) {
                throw new common_1.BadRequestException('父级预算不存在');
            }
            if (level === BUDGET_LEVELS.GROUP) {
                throw new common_1.BadRequestException('集团级预算不能有父级');
            }
        }
        else {
            if (level !== BUDGET_LEVELS.GROUP) {
                throw new common_1.BadRequestException('非集团级预算必须指定父级');
            }
        }
        const budget = {
            id: (0, uuid_1.v4)(),
            budgetCode: budgetCode || this.generateBudgetCode(level),
            name,
            description: description || '',
            level,
            parentId: parentId || null,
            path: parentBudget ? `${parentBudget.path}/${parentBudget.id}` : '',
            amount: parseFloat(amount.toString()),
            usedAmount: 0,
            occupiedAmount: 0,
            remainingAmount: parseFloat(amount.toString()),
            periodType: periodType || 'annual',
            periodYear: periodYear || new Date().getFullYear(),
            periodMonth: periodMonth || 0,
            status: 'active',
            children: [],
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.storageService.create('budgets', budget);
        if (parentBudget) {
            this.addChild(parentId, budget.id);
        }
        return budget;
    }
    generateBudgetCode(level) {
        const prefix = {
            [BUDGET_LEVELS.GROUP]: 'GRP',
            [BUDGET_LEVELS.COMPANY]: 'COM',
            [BUDGET_LEVELS.PROJECT]: 'PRJ'
        };
        const now = new Date();
        const timestamp = now.getTime().toString(36).toUpperCase();
        return `${prefix[level]}-${timestamp}`;
    }
    findOne(id) {
        const budget = this.storageService.findById('budgets', id);
        if (!budget) {
            throw new common_1.NotFoundException('预算不存在');
        }
        return budget;
    }
    findAll(userId, userRole, level, parentId, includeChildren = true) {
        let budgets = this.storageService.read('budgets');
        if (level) {
            budgets = budgets.filter(b => b.level === level);
        }
        if (parentId === 'root') {
            budgets = budgets.filter(b => !b.parentId);
        }
        else if (parentId) {
            budgets = budgets.filter(b => b.parentId === parentId);
        }
        if (includeChildren) {
            budgets = budgets.map(budget => this.buildTree(budget, this.storageService.read('budgets')));
        }
        return budgets;
    }
    findAllPaginated(userId, userRole, page = 1, pageSize = 10, level, parentId) {
        const budgets = this.findAll(userId, userRole, level, parentId, false);
        return this.storageService.paginate(budgets, page, pageSize);
    }
    buildTree(budget, allBudgets) {
        const children = allBudgets
            .filter(b => b.parentId === budget.id)
            .map(child => this.buildTree(child, allBudgets));
        return { ...budget, children };
    }
    addChild(parentId, childId) {
        const parent = this.findOne(parentId);
        if (!parent.children) {
            parent.children = [];
        }
        if (!parent.children.includes(childId)) {
            parent.children.push(childId);
            this.storageService.update('budgets', parentId, { children: parent.children });
        }
    }
    update(id, updateBudgetDto) {
        const budget = this.findOne(id);
        if (updateBudgetDto.amount !== undefined) {
            const newAmount = parseFloat(updateBudgetDto.amount.toString());
            const totalUsed = budget.usedAmount + budget.occupiedAmount;
            if (newAmount < totalUsed) {
                throw new common_1.BadRequestException(`预算金额不能小于已使用+已占用金额 (${totalUsed})`);
            }
            updateBudgetDto.remainingAmount = newAmount - totalUsed;
        }
        updateBudgetDto.updatedAt = new Date().toISOString();
        const updated = this.storageService.update('budgets', id, updateBudgetDto);
        if (!updated) {
            throw new common_1.NotFoundException('更新失败');
        }
        return updated;
    }
    remove(id) {
        const budget = this.findOne(id);
        const children = this.findAll(null, null, null, id, false);
        if (children.length > 0) {
            throw new common_1.BadRequestException('存在子级预算，无法删除');
        }
        if (budget.usedAmount > 0 || budget.occupiedAmount > 0) {
            throw new common_1.BadRequestException('存在已使用或已占用金额，无法删除');
        }
        if (budget.parentId) {
            const parent = this.findOne(budget.parentId);
            if (parent.children) {
                parent.children = parent.children.filter(cid => cid !== id);
                this.storageService.update('budgets', budget.parentId, { children: parent.children });
            }
        }
        const deleted = this.storageService.delete('budgets', id);
        if (!deleted) {
            throw new common_1.NotFoundException('删除失败');
        }
        return { message: '删除成功' };
    }
    occupy(budgetId, amount, sourceId, sourceType, description) {
        const budget = this.findOne(budgetId);
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
        this.storageService.create('budget-logs', log);
        budget.occupiedAmount += occupyAmount;
        budget.remainingAmount = budget.amount - budget.usedAmount - budget.occupiedAmount;
        budget.updatedAt = now;
        this.storageService.update('budgets', budgetId, {
            occupiedAmount: budget.occupiedAmount,
            remainingAmount: budget.remainingAmount,
            updatedAt: now
        });
        return { success: true, log, budget };
    }
    release(budgetId, amount, sourceId, description) {
        const budget = this.findOne(budgetId);
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
        this.storageService.create('budget-logs', log);
        budget.occupiedAmount -= releaseAmount;
        budget.remainingAmount = budget.amount - budget.usedAmount - budget.occupiedAmount;
        budget.updatedAt = now;
        this.storageService.update('budgets', budgetId, {
            occupiedAmount: budget.occupiedAmount,
            remainingAmount: budget.remainingAmount,
            updatedAt: now
        });
        return { success: true, log, budget };
    }
    deduct(budgetId, amount, sourceId, sourceType, description) {
        const budget = this.findOne(budgetId);
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
        this.storageService.create('budget-logs', log);
        this.storageService.update('budgets', budgetId, {
            usedAmount: budget.usedAmount,
            occupiedAmount: budget.occupiedAmount,
            remainingAmount: budget.remainingAmount,
            updatedAt: now
        });
        return { success: true, log, budget };
    }
    rollback(budgetId, amount, sourceId, description) {
        const budget = this.findOne(budgetId);
        const rollbackAmount = parseFloat(amount.toString());
        if (budget.usedAmount < rollbackAmount) {
            throw new common_1.BadRequestException(`已使用金额不足，已使用: ${budget.usedAmount}, 需要回滚: ${rollbackAmount}`);
        }
        const now = new Date().toISOString();
        const log = {
            id: (0, uuid_1.v4)(),
            budgetId,
            type: 'rollback',
            amount: rollbackAmount,
            sourceId,
            sourceType: 'reimbursement',
            description: description || '预算回滚',
            beforeAmount: budget.remainingAmount,
            afterAmount: budget.remainingAmount + rollbackAmount,
            createdAt: now,
        };
        this.storageService.create('budget-logs', log);
        budget.usedAmount -= rollbackAmount;
        budget.remainingAmount = budget.amount - budget.usedAmount - budget.occupiedAmount;
        budget.updatedAt = now;
        this.storageService.update('budgets', budgetId, {
            usedAmount: budget.usedAmount,
            remainingAmount: budget.remainingAmount,
            updatedAt: now
        });
        return { success: true, log, budget };
    }
    getBudgetTree() {
        const budgets = this.storageService.read('budgets');
        const rootBudgets = budgets.filter(b => !b.parentId);
        return rootBudgets.map(budget => this.buildTree(budget, budgets));
    }
    getLogs(budgetId, type, page = 1, pageSize = 20) {
        let logs = this.storageService.read('budget-logs');
        if (budgetId) {
            logs = logs.filter(l => l.budgetId === budgetId);
        }
        if (type) {
            logs = logs.filter(l => l.type === type);
        }
        logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return this.storageService.paginate(logs, page, pageSize);
    }
    getStatistics() {
        const budgets = this.storageService.read('budgets');
        const logs = this.storageService.read('budget-logs');
        const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
        const totalUsed = budgets.reduce((sum, b) => sum + b.usedAmount, 0);
        const totalOccupied = budgets.reduce((sum, b) => sum + b.occupiedAmount, 0);
        const totalRemaining = totalBudget - totalUsed - totalOccupied;
        const byLevel = {
            [BUDGET_LEVELS.GROUP]: { count: 0, amount: 0, used: 0, occupied: 0 },
            [BUDGET_LEVELS.COMPANY]: { count: 0, amount: 0, used: 0, occupied: 0 },
            [BUDGET_LEVELS.PROJECT]: { count: 0, amount: 0, used: 0, occupied: 0 },
        };
        budgets.forEach(b => {
            if (byLevel[b.level]) {
                byLevel[b.level].count++;
                byLevel[b.level].amount += b.amount;
                byLevel[b.level].used += b.usedAmount;
                byLevel[b.level].occupied += b.occupiedAmount;
            }
        });
        return {
            summary: {
                totalBudget,
                totalUsed,
                totalOccupied,
                totalRemaining,
                utilizationRate: totalBudget > 0 ? ((totalUsed / totalBudget) * 100).toFixed(2) : 0,
                totalCount: budgets.length,
            },
            byLevel,
            recentLogs: logs.slice(-10),
        };
    }
    generateMockData(count, userId) {
        const groupNames = ['集团总部', '华南区域', '华东区域', '华北区域'];
        const companyNames = ['深圳分公司', '广州分公司', '上海分公司', '杭州分公司', '北京分公司', '天津分公司'];
        const projectNames = ['CRM系统升级', 'OA系统建设', '数据中台项目', '客户服务平台', '智能分析系统', '移动办公APP'];
        const levels = [BUDGET_LEVELS.GROUP, BUDGET_LEVELS.COMPANY, BUDGET_LEVELS.PROJECT];
        const createdIds = [];
        for (let i = 0; i < 2; i++) {
            const groupBudget = this.create({
                name: groupNames[i % groupNames.length],
                amount: 10000000 + Math.random() * 5000000,
                level: BUDGET_LEVELS.GROUP,
                description: '集团年度预算',
                periodType: 'annual',
                periodYear: new Date().getFullYear(),
            }, userId);
            createdIds.push(groupBudget.id);
            for (let j = 0; j < 3; j++) {
                const companyBudget = this.create({
                    parentId: groupBudget.id,
                    name: companyNames[(i * 3 + j) % companyNames.length],
                    amount: 2000000 + Math.random() * 1000000,
                    level: BUDGET_LEVELS.COMPANY,
                    description: '分公司年度预算',
                    periodType: 'annual',
                    periodYear: new Date().getFullYear(),
                }, userId);
                createdIds.push(companyBudget.id);
                for (let k = 0; k < 2; k++) {
                    const projectBudget = this.create({
                        parentId: companyBudget.id,
                        name: projectNames[(j * 2 + k) % projectNames.length],
                        amount: 500000 + Math.random() * 300000,
                        level: BUDGET_LEVELS.PROJECT,
                        description: '项目预算',
                        periodType: 'annual',
                        periodYear: new Date().getFullYear(),
                    }, userId);
                    createdIds.push(projectBudget.id);
                    if (Math.random() > 0.5) {
                        const occupyAmount = Math.floor(projectBudget.amount * 0.1);
                        this.occupy(projectBudget.id, occupyAmount, (0, uuid_1.v4)(), 'reimbursement', '模拟占用');
                    }
                    if (Math.random() > 0.6) {
                        const deductAmount = Math.floor(projectBudget.amount * 0.05);
                        this.deduct(projectBudget.id, deductAmount, (0, uuid_1.v4)(), 'reimbursement', '模拟扣减');
                    }
                }
            }
        }
        return createdIds.length;
    }
    clearMockData() {
        const budgets = this.storageService.read('budgets');
        const logs = this.storageService.read('budget-logs');
        this.storageService.write('budgets', []);
        this.storageService.write('budget-logs', []);
        return {
            budgetsCount: budgets.length,
            logsCount: logs.length,
        };
    }
};
exports.BudgetService = BudgetService;
exports.BudgetService = BudgetService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [json_storage_service_1.JsonStorageService])
], BudgetService);
