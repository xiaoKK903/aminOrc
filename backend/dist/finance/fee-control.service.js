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
exports.FeeControlService = void 0;
const common_1 = require("@nestjs/common");
const json_storage_service_1 = require("../common/json-storage.service");
const uuid_1 = require("uuid");
const FORBIDDEN_PATTERNS = [
    /document\s*\./g, /window\s*\./g, /eval\s*\(/g,
    /new\s+Function/g, /setTimeout\s*\(/g, /setInterval\s*\(/g,
    /fetch\s*\(/g, /XMLHttpRequest/g, /localStorage/g,
    /indexedDB/g, /process\s*\./g, /require\s*\(/g,
    /__dirname/g, /__filename/g, /module\s*\./g,
];
const RULE_ACTIONS = {
    BLOCK: 'block',
    WARNING: 'warning',
    REMIND: 'remind',
    PASS: 'pass'
};
const RULE_STATUSES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DRAFT: 'draft'
};
let FeeControlService = class FeeControlService {
    storageService;
    constructor(storageService) {
        this.storageService = storageService;
    }
    create(createRuleDto, userId) {
        const { name, description, ruleType, budgetLevel, budgetId, conditionScript, action, priority, applyToAll } = createRuleDto;
        const rule = {
            id: (0, uuid_1.v4)(),
            name,
            description: description || '',
            ruleType: ruleType || 'budget',
            budgetLevel: budgetLevel || null,
            budgetId: budgetId || null,
            conditionScript: conditionScript || '',
            action: action || RULE_ACTIONS.WARNING,
            priority: priority || 0,
            applyToAll: applyToAll || false,
            status: RULE_STATUSES.DRAFT,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.storageService.create('fee-control-rules', rule);
        return rule;
    }
    findOne(id) {
        const rule = this.storageService.findById('fee-control-rules', id);
        if (!rule) {
            throw new common_1.NotFoundException('费控规则不存在');
        }
        return rule;
    }
    findAll(userId, userRole, status, ruleType, budgetId) {
        let rules = this.storageService.read('fee-control-rules');
        if (status) {
            rules = rules.filter(r => r.status === status);
        }
        if (ruleType) {
            rules = rules.filter(r => r.ruleType === ruleType);
        }
        if (budgetId) {
            rules = rules.filter(r => r.budgetId === budgetId || r.applyToAll);
        }
        rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        return rules;
    }
    findAllPaginated(userId, userRole, page = 1, pageSize = 10, status, ruleType, budgetId) {
        const rules = this.findAll(userId, userRole, status, ruleType, budgetId);
        return this.storageService.paginate(rules, page, pageSize);
    }
    update(id, updateRuleDto) {
        updateRuleDto.updatedAt = new Date().toISOString();
        const updated = this.storageService.update('fee-control-rules', id, updateRuleDto);
        if (!updated) {
            throw new common_1.NotFoundException('更新失败');
        }
        return updated;
    }
    remove(id) {
        const deleted = this.storageService.delete('fee-control-rules', id);
        if (!deleted) {
            throw new common_1.NotFoundException('删除失败');
        }
        return { message: '删除成功' };
    }
    activate(id) {
        return this.update(id, { status: RULE_STATUSES.ACTIVE, updatedAt: new Date().toISOString() });
    }
    deactivate(id) {
        return this.update(id, { status: RULE_STATUSES.INACTIVE, updatedAt: new Date().toISOString() });
    }
    validateScript(script) {
        if (!script || script.trim() === '') {
            return { valid: true, error: null };
        }
        for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.test(script)) {
                return {
                    valid: false,
                    error: '脚本包含禁止的操作'
                };
            }
        }
        try {
            new Function('data', 'budget', 'request', script);
            return { valid: true, error: null };
        }
        catch (e) {
            return { valid: false, error: `脚本语法错误: ${e.message}` };
        }
    }
    executeRule(rule, context) {
        const { data, budget, request } = context;
        if (rule.status !== RULE_STATUSES.ACTIVE) {
            return { passed: true, action: RULE_ACTIONS.PASS, message: '规则未激活' };
        }
        if (rule.applyToAll) {
        }
        else if (rule.budgetId && budget && budget.id !== rule.budgetId) {
            return { passed: true, action: RULE_ACTIONS.PASS, message: '规则不适用此预算' };
        }
        try {
            const validation = this.validateScript(rule.conditionScript);
            if (!validation.valid) {
                return {
                    passed: false,
                    action: RULE_ACTIONS.BLOCK,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    message: validation.error,
                    blocked: true
                };
            }
            const fn = new Function('data', 'budget', 'request', `
                "use strict";
                try {
                    return ${rule.conditionScript};
                } catch (e) {
                    throw new Error('规则执行错误: ' + e.message);
                }
            `);
            const result = fn(data, budget, request);
            if (result === true) {
                const action = rule.action;
                let blocked = false;
                if (action === RULE_ACTIONS.BLOCK) {
                    blocked = true;
                }
                return {
                    passed: !blocked,
                    action,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    message: rule.description || '触发费控规则',
                    blocked
                };
            }
            return { passed: true, action: RULE_ACTIONS.PASS, message: '规则未触发' };
        }
        catch (e) {
            return {
                passed: false,
                action: RULE_ACTIONS.BLOCK,
                ruleId: rule.id,
                ruleName: rule.name,
                message: `规则执行错误: ${e.message}`,
                blocked: true,
                error: e.message
            };
        }
    }
    checkReimbursement(reimbursement, budget) {
        const rules = this.findAll(null, null, RULE_STATUSES.ACTIVE, 'budget', budget?.id);
        const results = [];
        let blocked = false;
        let blockingRule = null;
        for (const rule of rules) {
            const result = this.executeRule(rule, {
                data: reimbursement,
                budget: budget,
                request: reimbursement
            });
            results.push(result);
            if (result.blocked) {
                blocked = true;
                blockingRule = result;
            }
        }
        const log = {
            id: (0, uuid_1.v4)(),
            reimbursementId: reimbursement.id || null,
            budgetId: budget?.id || null,
            results,
            blocked,
            blockingRule: blockingRule ? {
                ruleId: blockingRule.ruleId,
                ruleName: blockingRule.ruleName,
                message: blockingRule.message
            } : null,
            createdAt: new Date().toISOString(),
        };
        this.storageService.create('fee-control-logs', log);
        return {
            passed: !blocked,
            blocked,
            blockingRule,
            results,
            logId: log.id
        };
    }
    getLogs(reimbursementId, budgetId, page = 1, pageSize = 20) {
        let logs = this.storageService.read('fee-control-logs');
        if (reimbursementId) {
            logs = logs.filter(l => l.reimbursementId === reimbursementId);
        }
        if (budgetId) {
            logs = logs.filter(l => l.budgetId === budgetId);
        }
        logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return this.storageService.paginate(logs, page, pageSize);
    }
    getStatistics() {
        const rules = this.storageService.read('fee-control-rules');
        const logs = this.storageService.read('fee-control-logs');
        const stats = {
            totalRules: rules.length,
            activeRules: rules.filter(r => r.status === RULE_STATUSES.ACTIVE).length,
            inactiveRules: rules.filter(r => r.status === RULE_STATUSES.INACTIVE).length,
            draftRules: rules.filter(r => r.status === RULE_STATUSES.DRAFT).length,
            byType: {},
            byAction: {},
            totalChecks: logs.length,
            blockedCount: logs.filter(l => l.blocked).length,
            passedCount: logs.filter(l => !l.blocked).length,
        };
        rules.forEach(r => {
            stats.byType[r.ruleType] = (stats.byType[r.ruleType] || 0) + 1;
            stats.byAction[r.action] = (stats.byAction[r.action] || 0) + 1;
        });
        return stats;
    }
    generateMockData(count, userId) {
        const ruleTemplates = [
            {
                name: '单张发票金额限制',
                description: '单张发票金额超过10000元需要特别审批',
                ruleType: 'budget',
                action: RULE_ACTIONS.WARNING,
                conditionScript: `data.invoiceAmount > 10000`,
                priority: 10
            },
            {
                name: '月度预算超支检查',
                description: '报销金额超过月度预算剩余的80%时提醒',
                ruleType: 'budget',
                action: RULE_ACTIONS.WARNING,
                conditionScript: `data.amount > (budget.remainingAmount * 0.8)`,
                priority: 5
            },
            {
                name: '禁止超预算报销',
                description: '报销金额不能超过预算剩余金额',
                ruleType: 'budget',
                action: RULE_ACTIONS.BLOCK,
                conditionScript: `data.amount > budget.remainingAmount`,
                priority: 100
            },
            {
                name: '大额报销审批检查',
                description: '金额超过50000元的报销需要总经理审批',
                ruleType: 'custom',
                action: RULE_ACTIONS.REMIND,
                conditionScript: `data.amount > 50000`,
                priority: 20
            },
            {
                name: '发票日期检查',
                description: '发票日期超过一年的报销需要特别说明',
                ruleType: 'custom',
                action: RULE_ACTIONS.WARNING,
                conditionScript: `data.invoiceDate && (Date.now() - new Date(data.invoiceDate).getTime()) > 365 * 24 * 60 * 60 * 1000`,
                priority: 1
            },
        ];
        for (let i = 0; i < Math.min(count, ruleTemplates.length); i++) {
            const template = ruleTemplates[i];
            this.create({
                ...template,
                applyToAll: true,
                budgetLevel: null,
                budgetId: null,
            }, userId);
        }
        return Math.min(count, ruleTemplates.length);
    }
    clearMockData() {
        const rules = this.storageService.read('fee-control-rules');
        const logs = this.storageService.read('fee-control-logs');
        this.storageService.write('fee-control-rules', []);
        this.storageService.write('fee-control-logs', []);
        return {
            rulesCount: rules.length,
            logsCount: logs.length,
        };
    }
};
exports.FeeControlService = FeeControlService;
exports.FeeControlService = FeeControlService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [json_storage_service_1.JsonStorageService])
], FeeControlService);
