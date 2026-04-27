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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const sqlite_storage_service_1 = require("../common/sqlite-storage.service");
const uuid_1 = require("uuid");
let InventoryService = class InventoryService {
    sqliteStorageService;
    constructor(sqliteStorageService) {
        this.sqliteStorageService = sqliteStorageService;
    }
    getInventory(warehouseId, skuId) {
        const inventory = this.sqliteStorageService.findOne('inventory', {
            warehouseId,
            skuId
        });
        if (!inventory) {
            throw new common_1.NotFoundException('库存不存在');
        }
        return inventory;
    }
    getInventoryByWarehouse(warehouseId, page = 1, pageSize = 20, keyword) {
        let inventory = this.sqliteStorageService.findAll('inventory', { warehouseId });
        if (keyword) {
            const skus = this.sqliteStorageService.read('skus');
            const kw = keyword.toLowerCase();
            const matchedSkuIds = skus
                .filter(s => s.name.toLowerCase().includes(kw) || s.skuCode.toLowerCase().includes(kw))
                .map(s => s.id);
            inventory = inventory.filter(inv => matchedSkuIds.includes(inv.skuId));
        }
        const skus = this.sqliteStorageService.read('skus');
        const inventoryWithSku = inventory.map(inv => {
            const sku = skus.find(s => s.id === inv.skuId);
            return {
                ...inv,
                skuCode: sku?.skuCode || 'N/A',
                skuName: sku?.name || 'N/A',
                category: sku?.category || 'N/A'
            };
        });
        const total = inventoryWithSku.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const data = inventoryWithSku.slice(startIndex, endIndex);
        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }
    getInventoryBySku(skuId) {
        const inventory = this.sqliteStorageService.findAll('inventory', { skuId });
        const warehouses = this.sqliteStorageService.read('warehouses');
        return inventory.map(inv => {
            const warehouse = warehouses.find(w => w.id === inv.warehouseId);
            return {
                ...inv,
                warehouseName: warehouse?.name || 'N/A',
                warehouseCode: warehouse?.code || 'N/A'
            };
        });
    }
    lock(warehouseId, skuId, quantity, sourceType, sourceId, remark = '') {
        if (quantity <= 0) {
            throw new common_1.BadRequestException('锁定数量必须大于0');
        }
        this.sqliteStorageService.beginTransaction();
        try {
            const inventory = this.sqliteStorageService.findOne('inventory', {
                warehouseId,
                skuId
            });
            if (!inventory) {
                this.sqliteStorageService.rollback();
                throw new common_1.NotFoundException('库存不存在');
            }
            if (inventory.availableQuantity < quantity) {
                this.sqliteStorageService.rollback();
                throw new common_1.BadRequestException(`可用库存不足。当前可用: ${inventory.availableQuantity}, 锁定需求: ${quantity}`);
            }
            const beforeQuantity = inventory.quantity;
            const beforeLocked = inventory.lockedQuantity;
            const newLockedQuantity = inventory.lockedQuantity + quantity;
            const newAvailableQuantity = inventory.quantity - newLockedQuantity;
            this.sqliteStorageService.update('inventory', inventory.id, {
                lockedQuantity: newLockedQuantity,
                availableQuantity: newAvailableQuantity
            });
            this.sqliteStorageService.create('inventoryLogs', {
                warehouseId,
                skuId,
                type: 'lock',
                quantity,
                beforeQuantity,
                afterQuantity: beforeQuantity,
                beforeLocked,
                afterLocked: newLockedQuantity,
                sourceType,
                sourceId,
                remark: remark || `锁定库存 ${quantity} 个`
            });
            this.sqliteStorageService.commit();
            return {
                success: true,
                warehouseId,
                skuId,
                quantity,
                newLockedQuantity,
                newAvailableQuantity
            };
        }
        catch (error) {
            this.sqliteStorageService.rollback();
            throw error;
        }
    }
    deduct(warehouseId, skuId, quantity, sourceType, sourceId, remark = '') {
        if (quantity <= 0) {
            throw new common_1.BadRequestException('扣减数量必须大于0');
        }
        this.sqliteStorageService.beginTransaction();
        try {
            const inventory = this.sqliteStorageService.findOne('inventory', {
                warehouseId,
                skuId
            });
            if (!inventory) {
                this.sqliteStorageService.rollback();
                throw new common_1.NotFoundException('库存不存在');
            }
            const beforeQuantity = inventory.quantity;
            const beforeLocked = inventory.lockedQuantity;
            if (inventory.lockedQuantity < quantity) {
                this.sqliteStorageService.rollback();
                throw new common_1.BadRequestException(`锁定库存不足。当前锁定: ${inventory.lockedQuantity}, 扣减需求: ${quantity}`);
            }
            const newQuantity = inventory.quantity - quantity;
            const newLockedQuantity = inventory.lockedQuantity - quantity;
            const newAvailableQuantity = newQuantity - newLockedQuantity;
            this.sqliteStorageService.update('inventory', inventory.id, {
                quantity: newQuantity,
                lockedQuantity: newLockedQuantity,
                availableQuantity: newAvailableQuantity
            });
            this.sqliteStorageService.create('inventoryLogs', {
                warehouseId,
                skuId,
                type: 'deduct',
                quantity,
                beforeQuantity,
                afterQuantity: newQuantity,
                beforeLocked,
                afterLocked: newLockedQuantity,
                sourceType,
                sourceId,
                remark: remark || `扣减库存 ${quantity} 个`
            });
            this.sqliteStorageService.commit();
            return {
                success: true,
                warehouseId,
                skuId,
                quantity,
                newQuantity,
                newLockedQuantity,
                newAvailableQuantity
            };
        }
        catch (error) {
            this.sqliteStorageService.rollback();
            throw error;
        }
    }
    release(warehouseId, skuId, quantity, sourceType, sourceId, remark = '') {
        if (quantity <= 0) {
            throw new common_1.BadRequestException('释放数量必须大于0');
        }
        this.sqliteStorageService.beginTransaction();
        try {
            const inventory = this.sqliteStorageService.findOne('inventory', {
                warehouseId,
                skuId
            });
            if (!inventory) {
                this.sqliteStorageService.rollback();
                throw new common_1.NotFoundException('库存不存在');
            }
            if (inventory.lockedQuantity < quantity) {
                this.sqliteStorageService.rollback();
                throw new common_1.BadRequestException(`锁定库存不足。当前锁定: ${inventory.lockedQuantity}, 释放需求: ${quantity}`);
            }
            const beforeQuantity = inventory.quantity;
            const beforeLocked = inventory.lockedQuantity;
            const newLockedQuantity = inventory.lockedQuantity - quantity;
            const newAvailableQuantity = inventory.quantity - newLockedQuantity;
            this.sqliteStorageService.update('inventory', inventory.id, {
                lockedQuantity: newLockedQuantity,
                availableQuantity: newAvailableQuantity
            });
            this.sqliteStorageService.create('inventoryLogs', {
                warehouseId,
                skuId,
                type: 'release',
                quantity,
                beforeQuantity,
                afterQuantity: beforeQuantity,
                beforeLocked,
                afterLocked: newLockedQuantity,
                sourceType,
                sourceId,
                remark: remark || `释放库存锁定 ${quantity} 个`
            });
            this.sqliteStorageService.commit();
            return {
                success: true,
                warehouseId,
                skuId,
                quantity,
                newLockedQuantity,
                newAvailableQuantity
            };
        }
        catch (error) {
            this.sqliteStorageService.rollback();
            throw error;
        }
    }
    rollback(warehouseId, skuId, quantity, sourceType, sourceId, remark = '') {
        if (quantity <= 0) {
            throw new common_1.BadRequestException('回滚数量必须大于0');
        }
        this.sqliteStorageService.beginTransaction();
        try {
            const inventory = this.sqliteStorageService.findOne('inventory', {
                warehouseId,
                skuId
            });
            const beforeQuantity = inventory ? inventory.quantity : 0;
            const beforeLocked = inventory ? inventory.lockedQuantity : 0;
            if (!inventory) {
                this.sqliteStorageService.create('inventory', {
                    warehouseId,
                    skuId,
                    quantity,
                    lockedQuantity: 0,
                    availableQuantity: quantity,
                    avgCost: 0
                });
            }
            else {
                const newQuantity = inventory.quantity + quantity;
                this.sqliteStorageService.update('inventory', inventory.id, {
                    quantity: newQuantity,
                    availableQuantity: newQuantity - inventory.lockedQuantity
                });
            }
            this.sqliteStorageService.create('inventoryLogs', {
                warehouseId,
                skuId,
                type: 'rollback',
                quantity,
                beforeQuantity,
                afterQuantity: beforeQuantity + quantity,
                beforeLocked,
                afterLocked: beforeLocked,
                sourceType,
                sourceId,
                remark: remark || `回滚库存 ${quantity} 个`
            });
            this.sqliteStorageService.commit();
            return {
                success: true,
                warehouseId,
                skuId,
                quantity,
                newQuantity: beforeQuantity + quantity
            };
        }
        catch (error) {
            this.sqliteStorageService.rollback();
            throw error;
        }
    }
    lockFromMultiple(skuId, quantity, preferredWarehouseId = null) {
        const inventoryList = this.sqliteStorageService.findAll('inventory', { skuId })
            .filter(inv => inv.availableQuantity > 0)
            .sort((a, b) => {
            if (preferredWarehouseId) {
                if (a.warehouseId === preferredWarehouseId)
                    return -1;
                if (b.warehouseId === preferredWarehouseId)
                    return 1;
            }
            return b.availableQuantity - a.availableQuantity;
        });
        const locks = [];
        let remaining = quantity;
        for (const inventory of inventoryList) {
            if (remaining <= 0)
                break;
            const lockQuantity = Math.min(inventory.availableQuantity, remaining);
            const lockResult = this.lock(inventory.warehouseId, skuId, lockQuantity, 'multi_source', (0, uuid_1.v4)(), `多仓库库存锁定 - ${lockQuantity} 个`);
            locks.push(lockResult);
            remaining -= lockQuantity;
        }
        if (remaining > 0) {
            for (const lock of locks) {
                this.release(lock.warehouseId, skuId, lock.quantity, 'multi_source_rollback', (0, uuid_1.v4)(), `回滚多仓库锁定`);
            }
            throw new common_1.BadRequestException(`库存不足。需要 ${quantity} 个，可用库存不足`);
        }
        return {
            success: true,
            totalQuantity: quantity,
            locks,
            warehouseCount: locks.length
        };
    }
    getLogs(warehouseId = null, skuId = null, type = null, sourceType = null, page = 1, pageSize = 20) {
        let logs = this.sqliteStorageService.findAll('inventoryLogs', {
            field: 'createdAt',
            desc: true
        });
        if (warehouseId) {
            logs = logs.filter(log => log.warehouseId === warehouseId);
        }
        if (skuId) {
            logs = logs.filter(log => log.skuId === skuId);
        }
        if (type) {
            logs = logs.filter(log => log.type === type);
        }
        if (sourceType) {
            logs = logs.filter(log => log.sourceType === sourceType);
        }
        const total = logs.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const data = logs.slice(startIndex, endIndex);
        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }
    getStatistics() {
        const inventory = this.sqliteStorageService.read('inventory');
        const warehouses = this.sqliteStorageService.read('warehouses');
        const skus = this.sqliteStorageService.read('skus');
        const totalQuantity = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalLocked = inventory.reduce((sum, inv) => sum + inv.lockedQuantity, 0);
        const totalAvailable = totalQuantity - totalLocked;
        const warehouseStats = warehouses.map(wh => {
            const whInventory = inventory.filter(inv => inv.warehouseId === wh.id);
            return {
                id: wh.id,
                name: wh.name,
                code: wh.code,
                skuCount: whInventory.length,
                totalQuantity: whInventory.reduce((sum, inv) => sum + inv.quantity, 0),
                lockedQuantity: whInventory.reduce((sum, inv) => sum + inv.lockedQuantity, 0)
            };
        });
        const lowInventory = inventory.filter(inv => {
            const sku = skus.find(s => s.id === inv.skuId);
            if (!sku)
                return false;
            return inv.quantity <= sku.safetyStock;
        }).map(inv => {
            const sku = skus.find(s => s.id === inv.skuId);
            const warehouse = warehouses.find(w => w.id === inv.warehouseId);
            return {
                ...inv,
                skuCode: sku?.skuCode,
                skuName: sku?.name,
                safetyStock: sku?.safetyStock,
                warehouseName: warehouse?.name
            };
        });
        return {
            totalSkuLocations: inventory.length,
            totalQuantity,
            totalLocked,
            totalAvailable,
            warehouseStats,
            lowInventory,
            lowInventoryCount: lowInventory.length
        };
    }
    getDashboardStats() {
        const warehouses = this.sqliteStorageService.read('warehouses');
        const skus = this.sqliteStorageService.read('skus');
        const inventory = this.sqliteStorageService.read('inventory');
        const orders = this.sqliteStorageService.read('shipmentOrders');
        const logs = this.sqliteStorageService.read('inventoryLogs');
        const activeWarehouses = warehouses.filter(w => w.status === 'active').length;
        const activeSkus = skus.filter(s => s.status === 'active').length;
        const totalQuantity = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalLocked = inventory.reduce((sum, inv) => sum + inv.lockedQuantity, 0);
        const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'allocated').length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLogs = logs.filter(log => new Date(log.createdAt) >= today);
        const todayIn = todayLogs.filter(log => log.type === 'add' || log.type === 'rollback').reduce((sum, log) => sum + log.quantity, 0);
        const todayOut = todayLogs.filter(log => log.type === 'deduct').reduce((sum, log) => sum + log.quantity, 0);
        const lowInventory = inventory.filter(inv => {
            const sku = skus.find(s => s.id === inv.skuId);
            if (!sku)
                return false;
            return inv.quantity <= sku.safetyStock;
        }).length;
        return {
            activeWarehouses,
            activeSkus,
            totalInventory: totalQuantity,
            lockedInventory: totalLocked,
            availableInventory: totalQuantity - totalLocked,
            pendingOrders,
            todayIn,
            todayOut,
            lowInventoryCount: lowInventory
        };
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sqlite_storage_service_1.SqliteStorageService])
], InventoryService);
