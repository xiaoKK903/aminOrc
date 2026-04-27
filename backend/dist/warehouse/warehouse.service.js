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
exports.WarehouseService = void 0;
const common_1 = require("@nestjs/common");
const sqlite_storage_service_1 = require("../common/sqlite-storage.service");
let WarehouseService = class WarehouseService {
    sqliteStorageService;
    constructor(sqliteStorageService) {
        this.sqliteStorageService = sqliteStorageService;
    }
    create(createDto, userId) {
        const existing = this.sqliteStorageService.findOne('warehouses', { code: createDto.code });
        if (existing) {
            throw new common_1.BadRequestException('仓库编码已存在');
        }
        return this.sqliteStorageService.create('warehouses', {
            name: createDto.name,
            code: createDto.code,
            address: createDto.address || '',
            city: createDto.city || '',
            province: createDto.province || '',
            longitude: createDto.longitude || 0,
            latitude: createDto.latitude || 0,
            capacity: createDto.capacity || 100000,
            status: createDto.status || 'active',
            createdBy: userId
        });
    }
    findAllPaginated(page = 1, pageSize = 10, status, city, keyword) {
        const where = {};
        if (status) {
            where.status = status;
        }
        if (city) {
            where.city = city;
        }
        let items = this.sqliteStorageService.findAll('warehouses', {
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
        if (keyword) {
            const kw = keyword.toLowerCase();
            items = items.filter(item => item.name.toLowerCase().includes(kw) ||
                item.code.toLowerCase().includes(kw) ||
                item.address.toLowerCase().includes(kw));
        }
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
        return this.sqliteStorageService.findAll('warehouses', { status: 'active' }, {
            field: 'name',
            desc: false
        });
    }
    findOne(id) {
        const warehouse = this.sqliteStorageService.findById('warehouses', id);
        if (!warehouse) {
            throw new common_1.NotFoundException('仓库不存在');
        }
        const inventoryStats = this.sqliteStorageService.rawQuery('inventory', inv => inv.warehouseId === id);
        const totalSku = new Set(inventoryStats.map(inv => inv.skuId)).size;
        const totalQuantity = inventoryStats.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalLocked = inventoryStats.reduce((sum, inv) => sum + inv.lockedQuantity, 0);
        return {
            ...warehouse,
            inventoryStats: {
                totalSku,
                totalQuantity,
                totalLocked,
                availableQuantity: totalQuantity - totalLocked
            }
        };
    }
    update(id, updateDto) {
        const warehouse = this.sqliteStorageService.findById('warehouses', id);
        if (!warehouse) {
            throw new common_1.NotFoundException('仓库不存在');
        }
        if (updateDto.code && updateDto.code !== warehouse.code) {
            const existing = this.sqliteStorageService.findOne('warehouses', { code: updateDto.code });
            if (existing && existing.id !== id) {
                throw new common_1.BadRequestException('仓库编码已存在');
            }
        }
        return this.sqliteStorageService.update('warehouses', id, updateDto);
    }
    remove(id) {
        const warehouse = this.sqliteStorageService.findById('warehouses', id);
        if (!warehouse) {
            throw new common_1.NotFoundException('仓库不存在');
        }
        const inventory = this.sqliteStorageService.findAll('inventory', { warehouseId: id });
        if (inventory.length > 0) {
            throw new common_1.BadRequestException('仓库存在库存，无法删除');
        }
        return this.sqliteStorageService.delete('warehouses', id);
    }
    getStatistics() {
        const warehouses = this.sqliteStorageService.read('warehouses');
        const inventory = this.sqliteStorageService.read('inventory');
        const totalWarehouses = warehouses.length;
        const activeWarehouses = warehouses.filter(w => w.status === 'active').length;
        const totalSku = new Set(inventory.map(inv => inv.skuId)).size;
        const totalQuantity = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalLocked = inventory.reduce((sum, inv) => sum + inv.lockedQuantity, 0);
        const warehouseStats = warehouses.map(w => {
            const whInventory = inventory.filter(inv => inv.warehouseId === w.id);
            return {
                id: w.id,
                name: w.name,
                code: w.code,
                skuCount: new Set(whInventory.map(inv => inv.skuId)).size,
                totalQuantity: whInventory.reduce((sum, inv) => sum + inv.quantity, 0),
                lockedQuantity: whInventory.reduce((sum, inv) => sum + inv.lockedQuantity, 0),
                longitude: w.longitude,
                latitude: w.latitude,
                status: w.status
            };
        });
        return {
            totalWarehouses,
            activeWarehouses,
            totalSku,
            totalQuantity,
            totalLocked,
            availableQuantity: totalQuantity - totalLocked,
            warehouseStats
        };
    }
    getTopology() {
        const warehouses = this.sqliteStorageService.findAll('warehouses', { status: 'active' });
        const inventory = this.sqliteStorageService.read('inventory');
        const skus = this.sqliteStorageService.read('skus');
        const nodes = warehouses.map(w => {
            const whInventory = inventory.filter(inv => inv.warehouseId === w.id);
            return {
                id: w.id,
                name: w.name,
                code: w.code,
                longitude: w.longitude,
                latitude: w.latitude,
                skuCount: new Set(whInventory.map(inv => inv.skuId)).size,
                totalQuantity: whInventory.reduce((sum, inv) => sum + inv.quantity, 0),
                lockedQuantity: whInventory.reduce((sum, inv) => sum + inv.lockedQuantity, 0),
                status: w.status
            };
        });
        const skuDistribution = {};
        inventory.forEach(inv => {
            const sku = skus.find(s => s.id === inv.skuId);
            if (!skuDistribution[inv.skuId]) {
                skuDistribution[inv.skuId] = {
                    skuId: inv.skuId,
                    skuCode: sku?.skuCode || 'N/A',
                    skuName: sku?.name || 'N/A',
                    warehouses: [],
                    totalQuantity: 0,
                    totalLocked: 0
                };
            }
            skuDistribution[inv.skuId].warehouses.push({
                warehouseId: inv.warehouseId,
                warehouseName: warehouses.find(w => w.id === inv.warehouseId)?.name || 'N/A',
                quantity: inv.quantity,
                lockedQuantity: inv.lockedQuantity,
                availableQuantity: inv.availableQuantity
            });
            skuDistribution[inv.skuId].totalQuantity += inv.quantity;
            skuDistribution[inv.skuId].totalLocked += inv.lockedQuantity;
        });
        return {
            nodes,
            skuDistribution: Object.values(skuDistribution)
        };
    }
};
exports.WarehouseService = WarehouseService;
exports.WarehouseService = WarehouseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sqlite_storage_service_1.SqliteStorageService])
], WarehouseService);
