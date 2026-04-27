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
exports.SkuService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
let SkuService = class SkuService {
    sqliteStorageService;
    constructor(sqliteStorageService) {
        this.sqliteStorageService = sqliteStorageService;
    }
    create(createDto, userId) {
        const existing = this.sqliteStorageService.findOne('skus', { skuCode: createDto.skuCode });
        if (existing) {
            throw new common_1.BadRequestException('SKU编码已存在');
        }
        return this.sqliteStorageService.create('skus', {
            skuCode: createDto.skuCode,
            name: createDto.name,
            category: createDto.category || 'default',
            unit: createDto.unit || '个',
            specification: createDto.specification || '',
            minStock: createDto.minStock || 100,
            maxStock: createDto.maxStock || 10000,
            safetyStock: createDto.safetyStock || 200,
            status: createDto.status || 'active',
            createdBy: userId
        });
    }
    findAllPaginated(page = 1, pageSize = 10, category, status, keyword) {
        const where = {};
        if (status) {
            where.status = status;
        }
        let items = this.sqliteStorageService.findAll('skus', {
            field: 'createdAt',
            desc: true
        });
        if (Object.keys(where).length > 0) {
            items = items.filter(item => {
                for (const [key, value] of Object.entries(where)) {
                    if (item[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
        }
        if (category) {
            items = items.filter(item => item.category === category);
        }
        if (keyword) {
            const kw = keyword.toLowerCase();
            items = items.filter(item => item.name.toLowerCase().includes(kw) ||
                item.skuCode.toLowerCase().includes(kw));
        }
        const inventory = this.sqliteStorageService.read('inventory');
        items = items.map(sku => {
            const skuInventory = inventory.filter(inv => inv.skuId === sku.id);
            return {
                ...sku,
                inventory: {
                    totalQuantity: skuInventory.reduce((sum, inv) => sum + inv.quantity, 0),
                    totalLocked: skuInventory.reduce((sum, inv) => sum + inv.lockedQuantity, 0),
                    warehouseCount: skuInventory.length
                }
            };
        });
        const total = items.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const data = items.slice(startIndex, endIndex);
        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }
    findAllActive() {
        return this.sqliteStorageService.findAll('skus', { status: 'active' }, {
            field: 'name',
            desc: false
        });
    }
    findOne(id) {
        const sku = this.sqliteStorageService.findById('skus', id);
        if (!sku) {
            throw new common_1.NotFoundException('SKU不存在');
        }
        const inventory = this.sqliteStorageService.findAll('inventory', { skuId: id });
        const warehouses = this.sqliteStorageService.read('warehouses');
        const inventoryDetail = inventory.map(inv => {
            const warehouse = warehouses.find(w => w.id === inv.warehouseId);
            return {
                ...inv,
                warehouseName: warehouse?.name || 'N/A',
                warehouseCode: warehouse?.code || 'N/A'
            };
        });
        return {
            ...sku,
            inventory: {
                totalQuantity: inventory.reduce((sum, inv) => sum + inv.quantity, 0),
                totalLocked: inventory.reduce((sum, inv) => sum + inv.lockedQuantity, 0),
                warehouseCount: inventory.length,
                detail: inventoryDetail
            }
        };
    }
    findByCode(skuCode) {
        const sku = this.sqliteStorageService.findOne('skus', { skuCode });
        if (!sku) {
            throw new common_1.NotFoundException('SKU不存在');
        }
        return sku;
    }
    update(id, updateDto) {
        const sku = this.sqliteStorageService.findById('skus', id);
        if (!sku) {
            throw new common_1.NotFoundException('SKU不存在');
        }
        if (updateDto.skuCode && updateDto.skuCode !== sku.skuCode) {
            const existing = this.sqliteStorageService.findOne('skus', { skuCode: updateDto.skuCode });
            if (existing && existing.id !== id) {
                throw new common_1.BadRequestException('SKU编码已存在');
            }
        }
        return this.sqliteStorageService.update('skus', id, updateDto);
    }
    remove(id) {
        const sku = this.sqliteStorageService.findById('skus', id);
        if (!sku) {
            throw new common_1.NotFoundException('SKU不存在');
        }
        const inventory = this.sqliteStorageService.findAll('inventory', { skuId: id });
        const hasInventory = inventory.some(inv => inv.quantity > 0);
        if (hasInventory) {
            throw new common_1.BadRequestException('SKU存在库存，无法删除');
        }
        return this.sqliteStorageService.delete('skus', id);
    }
    getCategories() {
        const skus = this.sqliteStorageService.read('skus');
        const categories = new Map();
        skus.forEach(sku => {
            const count = categories.get(sku.category) || 0;
            categories.set(sku.category, count + 1);
        });
        return Array.from(categories.entries()).map(([name, count]) => ({ name, count }));
    }
    getStatistics() {
        const skus = this.sqliteStorageService.read('skus');
        const inventory = this.sqliteStorageService.read('inventory');
        const totalSku = skus.length;
        const activeSku = skus.filter(s => s.status === 'active').length;
        const categoryStats = this.getCategories();
        const lowStockSkus = skus.filter(sku => {
            const skuInventory = inventory.filter(inv => inv.skuId === sku.id);
            const totalQuantity = skuInventory.reduce((sum, inv) => sum + inv.quantity, 0);
            return totalQuantity <= sku.safetyStock;
        }).map(sku => {
            const skuInventory = inventory.filter(inv => inv.skuId === sku.id);
            const totalQuantity = skuInventory.reduce((sum, inv) => sum + inv.quantity, 0);
            return {
                ...sku,
                currentStock: totalQuantity
            };
        });
        const overStockSkus = skus.filter(sku => {
            const skuInventory = inventory.filter(inv => inv.skuId === sku.id);
            const totalQuantity = skuInventory.reduce((sum, inv) => sum + inv.quantity, 0);
            return totalQuantity >= sku.maxStock;
        }).map(sku => {
            const skuInventory = inventory.filter(inv => inv.skuId === sku.id);
            const totalQuantity = skuInventory.reduce((sum, inv) => sum + inv.quantity, 0);
            return {
                ...sku,
                currentStock: totalQuantity
            };
        });
        return {
            totalSku,
            activeSku,
            categoryStats,
            lowStockSkus,
            overStockSkus,
            lowStockCount: lowStockSkus.length,
            overStockCount: overStockSkus.length
        };
    }
    addInventory(warehouseId, skuId, quantity, costPrice = 0) {
        const warehouse = this.sqliteStorageService.findById('warehouses', warehouseId);
        if (!warehouse) {
            throw new common_1.NotFoundException('仓库不存在');
        }
        const sku = this.sqliteStorageService.findById('skus', skuId);
        if (!sku) {
            throw new common_1.NotFoundException('SKU不存在');
        }
        if (quantity <= 0) {
            throw new common_1.BadRequestException('入库数量必须大于0');
        }
        const beforeQuantity = 0;
        const beforeLocked = 0;
        let inventory = this.sqliteStorageService.findOne('inventory', {
            warehouseId,
            skuId
        });
        if (inventory) {
            beforeQuantity = inventory.quantity;
            beforeLocked = inventory.lockedQuantity;
            const newQuantity = inventory.quantity + quantity;
            this.sqliteStorageService.update('inventory', inventory.id, {
                quantity: newQuantity,
                availableQuantity: newQuantity - inventory.lockedQuantity,
                avgCost: inventory.avgCost > 0 ? (inventory.avgCost * inventory.quantity + costPrice * quantity) / (inventory.quantity + quantity) : costPrice
            });
        }
        else {
            inventory = this.sqliteStorageService.create('inventory', {
                warehouseId,
                skuId,
                quantity,
                lockedQuantity: 0,
                availableQuantity: quantity,
                avgCost: costPrice
            });
        }
        this.sqliteStorageService.create('inventoryLogs', {
            warehouseId,
            skuId,
            type: 'add',
            quantity,
            beforeQuantity,
            afterQuantity: inventory.quantity,
            beforeLocked,
            afterLocked: inventory.lockedQuantity,
            sourceType: 'inventory_add',
            sourceId: (0, uuid_1.v4)(),
            remark: `入库 ${quantity} 个`
        });
        return inventory;
    }
};
exports.SkuService = SkuService;
exports.SkuService = SkuService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], SkuService);
