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
exports.BillService = void 0;
const common_1 = require("@nestjs/common");
const json_storage_service_1 = require("../common/json-storage.service");
const uuid_1 = require("uuid");
const BILL_STATUSES = {
    IMPORTED: 'imported',
    PENDING: 'pending',
    MATCHED: 'matched',
    UNMATCHED: 'unmatched',
    RECONCILED: 'reconciled',
    DISPUTED: 'disputed'
};
const MATCH_STATUSES = {
    FULL: 'full',
    PARTIAL: 'partial',
    NONE: 'none'
};
let BillService = class BillService {
    storageService;
    constructor(storageService) {
        this.storageService = storageService;
    }
    create(createDto, userId) {
        const { billNo, billDate, amount, currency, supplier, category, description, attachments, sourceType, sourceId, items } = createDto;
        if (!billNo) {
            throw new common_1.BadRequestException('账单号不能为空');
        }
        if (!amount || amount <= 0) {
            throw new common_1.BadRequestException('账单金额必须大于0');
        }
        const existing = this.storageService.read('bills').find(b => b.billNo === billNo);
        if (existing) {
            throw new common_1.BadRequestException('账单号已存在');
        }
        const bill = {
            id: (0, uuid_1.v4)(),
            billNo,
            billDate: billDate || new Date().toISOString().split('T')[0],
            amount: parseFloat(amount.toString()),
            currency: currency || 'CNY',
            supplier: supplier || '',
            category: category || 'other',
            description: description || '',
            attachments: attachments || [],
            sourceType: sourceType || 'manual',
            sourceId: sourceId || null,
            items: items || [],
            status: BILL_STATUSES.IMPORTED,
            matchStatus: MATCH_STATUSES.NONE,
            matchedAmount: 0,
            unmatchedAmount: parseFloat(amount.toString()),
            matchedReimbursements: [],
            differences: [],
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.storageService.create('bills', bill);
        return bill;
    }
    findOne(id) {
        const bill = this.storageService.findById('bills', id);
        if (!bill) {
            throw new common_1.NotFoundException('账单不存在');
        }
        return bill;
    }
    findAll(userId, userRole, status, category, supplier, startDate, endDate, page = 1, pageSize = 10) {
        let bills = this.storageService.read('bills');
        if (status) {
            bills = bills.filter(b => b.status === status);
        }
        if (category) {
            bills = bills.filter(b => b.category === category);
        }
        if (supplier) {
            bills = bills.filter(b => b.supplier.includes(supplier));
        }
        if (startDate) {
            bills = bills.filter(b => b.billDate >= startDate);
        }
        if (endDate) {
            bills = bills.filter(b => b.billDate <= endDate);
        }
        bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return this.storageService.paginate(bills, page, pageSize);
    }
    update(id, updateDto) {
        const bill = this.findOne(id);
        if (bill.status === BILL_STATUSES.RECONCILED) {
            throw new common_1.BadRequestException('已对账的账单不能修改');
        }
        updateDto.updatedAt = new Date().toISOString();
        const updated = this.storageService.update('bills', id, updateDto);
        if (!updated) {
            throw new common_1.NotFoundException('更新失败');
        }
        return updated;
    }
    remove(id) {
        const bill = this.findOne(id);
        if (bill.status === BILL_STATUSES.RECONCILED) {
            throw new common_1.BadRequestException('已对账的账单不能删除');
        }
        const deleted = this.storageService.delete('bills', id);
        if (!deleted) {
            throw new common_1.NotFoundException('删除失败');
        }
        return { message: '删除成功' };
    }
    async importFromFile(fileData, userId) {
        const { content, fileName, fileType } = fileData;
        let bills = [];
        if (fileType === 'csv' || fileName.endsWith('.csv')) {
            bills = this.parseCsv(content);
        }
        else if (fileType === 'json' || fileName.endsWith('.json')) {
            bills = JSON.parse(content);
        }
        else {
            throw new common_1.BadRequestException('不支持的文件格式，仅支持CSV和JSON');
        }
        const imported = [];
        for (const billData of bills) {
            try {
                const bill = this.create({
                    billNo: billData.billNo || `IMP-${Date.now()}-${imported.length}`,
                    billDate: billData.billDate,
                    amount: billData.amount,
                    currency: billData.currency,
                    supplier: billData.supplier,
                    category: billData.category,
                    description: billData.description,
                    attachments: [{ name: fileName, type: 'import' }],
                    sourceType: 'import',
                    sourceId: null,
                    items: billData.items || [],
                }, userId);
                imported.push(bill);
            }
            catch (e) {
                console.error('导入账单失败:', e.message);
            }
        }
        return {
            total: bills.length,
            imported: imported.length,
            failed: bills.length - imported.length,
            bills: imported
        };
    }
    parseCsv(content) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            return [];
        }
        const headers = lines[0].split(',').map(h => h.trim());
        const bills = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const bill = {};
            headers.forEach((header, idx) => {
                bill[header.toLowerCase()] = values[idx] || '';
            });
            if (bill.amount) {
                bill.amount = parseFloat(bill.amount) || 0;
            }
            bills.push(bill);
        }
        return bills;
    }
    matchWithReimbursement(billId, reimbursementId, matchAmount, userId) {
        const bill = this.findOne(billId);
        const amount = parseFloat(matchAmount.toString());
        if (bill.unmatchedAmount < amount) {
            throw new common_1.BadRequestException(`账单剩余金额不足，剩余: ${bill.unmatchedAmount}`);
        }
        const matchedReimbursements = [...(bill.matchedReimbursements || [])];
        matchedReimbursements.push({
            reimbursementId,
            amount,
            matchedAt: new Date().toISOString(),
            matchedBy: userId
        });
        const matchedAmount = bill.matchedAmount + amount;
        const unmatchedAmount = bill.unmatchedAmount - amount;
        let matchStatus = bill.matchStatus;
        if (unmatchedAmount === 0) {
            matchStatus = MATCH_STATUSES.FULL;
        }
        else if (matchedAmount > 0) {
            matchStatus = MATCH_STATUSES.PARTIAL;
        }
        const updated = this.storageService.update('bills', billId, {
            matchedReimbursements,
            matchedAmount,
            unmatchedAmount,
            matchStatus,
            status: matchStatus === MATCH_STATUSES.FULL ? BILL_STATUSES.MATCHED : BILL_STATUSES.PENDING,
            updatedAt: new Date().toISOString(),
        });
        this.addHistory(billId, 'match', userId, `匹配报销单 ${reimbursementId}，金额: ${amount}`);
        return updated;
    }
    unmatch(billId, matchIndex, userId) {
        const bill = this.findOne(billId);
        const matchedReimbursements = [...(bill.matchedReimbursements || [])];
        if (matchIndex < 0 || matchIndex >= matchedReimbursements.length) {
            throw new common_1.BadRequestException('匹配记录不存在');
        }
        const removed = matchedReimbursements.splice(matchIndex, 1)[0];
        const matchedAmount = bill.matchedAmount - removed.amount;
        const unmatchedAmount = bill.unmatchedAmount + removed.amount;
        let matchStatus = bill.matchStatus;
        if (matchedAmount === 0) {
            matchStatus = MATCH_STATUSES.NONE;
        }
        else {
            matchStatus = MATCH_STATUSES.PARTIAL;
        }
        const updated = this.storageService.update('bills', billId, {
            matchedReimbursements,
            matchedAmount,
            unmatchedAmount,
            matchStatus,
            status: matchStatus === MATCH_STATUSES.NONE ? BILL_STATUSES.IMPORTED : BILL_STATUSES.PENDING,
            updatedAt: new Date().toISOString(),
        });
        this.addHistory(billId, 'unmatch', userId, `取消匹配报销单 ${removed.reimbursementId}，金额: ${removed.amount}`);
        return updated;
    }
    markDifference(billId, difference, userId) {
        const bill = this.findOne(billId);
        const differences = [...(bill.differences || [])];
        differences.push({
            id: (0, uuid_1.v4)(),
            type: difference.type || 'amount',
            description: difference.description,
            expectedAmount: difference.expectedAmount,
            actualAmount: difference.actualAmount,
            status: 'open',
            createdBy: userId,
            createdAt: new Date().toISOString(),
        });
        const updated = this.storageService.update('bills', billId, {
            differences,
            status: BILL_STATUSES.DISPUTED,
            updatedAt: new Date().toISOString(),
        });
        this.addHistory(billId, 'difference', userId, `标记差异: ${difference.description}`);
        return updated;
    }
    reconcile(billId, userId) {
        const bill = this.findOne(billId);
        if (bill.matchStatus !== MATCH_STATUSES.FULL) {
            throw new common_1.BadRequestException('账单未完全匹配，无法对账');
        }
        if (bill.status === BILL_STATUSES.DISPUTED) {
            const unresolved = bill.differences?.filter(d => d.status === 'open') || [];
            if (unresolved.length > 0) {
                throw new common_1.BadRequestException('存在未解决的差异，无法对账');
            }
        }
        const updated = this.storageService.update('bills', billId, {
            status: BILL_STATUSES.RECONCILED,
            reconciledAt: new Date().toISOString(),
            reconciledBy: userId,
            updatedAt: new Date().toISOString(),
        });
        this.addHistory(billId, 'reconcile', userId, '账单已对账完成');
        return updated;
    }
    addHistory(billId, action, userId, comment) {
        const history = {
            id: (0, uuid_1.v4)(),
            billId,
            action,
            userId,
            comment,
            createdAt: new Date().toISOString(),
        };
        this.storageService.create('bill-history', history);
        return history;
    }
    getHistory(billId) {
        const histories = this.storageService.read('bill-history')
            .filter(h => h.billId === billId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return histories;
    }
    getStatistics() {
        const bills = this.storageService.read('bills');
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const stats = {
            total: bills.length,
            byStatus: {},
            byMatchStatus: {},
            totalAmount: 0,
            matchedAmount: 0,
            unmatchedAmount: 0,
            thisMonthCount: 0,
            thisMonthAmount: 0,
            categories: {},
        };
        bills.forEach(b => {
            stats.byStatus[b.status] = (stats.byStatus[b.status] || 0) + 1;
            stats.byMatchStatus[b.matchStatus] = (stats.byMatchStatus[b.matchStatus] || 0) + 1;
            stats.totalAmount += b.amount || 0;
            stats.matchedAmount += b.matchedAmount || 0;
            stats.unmatchedAmount += b.unmatchedAmount || 0;
            if (new Date(b.createdAt) >= thisMonth) {
                stats.thisMonthCount++;
                stats.thisMonthAmount += b.amount || 0;
            }
            if (b.category) {
                stats.categories[b.category] = (stats.categories[b.category] || 0) + 1;
            }
        });
        stats.reconciliationRate = stats.total > 0
            ? ((stats.byStatus[BILL_STATUSES.RECONCILED] || 0) / stats.total * 100).toFixed(2)
            : 0;
        stats.matchRate = stats.totalAmount > 0
            ? ((stats.matchedAmount / stats.totalAmount) * 100).toFixed(2)
            : 0;
        return stats;
    }
    generateMockData(count, userId) {
        const categories = ['差旅费', '招待费', '办公用品', '通讯费', '交通费', '会议费', '培训费'];
        const suppliers = ['中国电信', '中国移动', '京东商城', '淘宝', '滴滴出行', '美团点评', '如家酒店', '中国国际航空'];
        for (let i = 0; i < count; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
            const amount = Math.floor(Math.random() * 10000) + 100;
            const statuses = Object.values(BILL_STATUSES);
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const matchedAmount = status === BILL_STATUSES.MATCHED || status === BILL_STATUSES.RECONCILED ? amount : 0;
            const bill = {
                id: (0, uuid_1.v4)(),
                billNo: `BIL-${Date.now()}-${i}`,
                billDate: new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                amount,
                currency: 'CNY',
                supplier,
                category,
                description: `${category}支出 - ${supplier}`,
                attachments: [],
                sourceType: 'mock',
                items: [{ name: category, amount, description: `${category}支出` }],
                status,
                matchStatus: matchedAmount > 0 ? MATCH_STATUSES.FULL : MATCH_STATUSES.NONE,
                matchedAmount,
                unmatchedAmount: amount - matchedAmount,
                matchedReimbursements: [],
                differences: [],
                createdBy: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            this.storageService.create('bills', bill);
        }
        return count;
    }
    clearMockData() {
        const bills = this.storageService.read('bills');
        const histories = this.storageService.read('bill-history');
        this.storageService.write('bills', []);
        this.storageService.write('bill-history', []);
        return {
            billsCount: bills.length,
            historiesCount: histories.length,
        };
    }
};
exports.BillService = BillService;
exports.BillService = BillService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [json_storage_service_1.JsonStorageService])
], BillService);
