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
exports.ShipmentOrderService = void 0;
const common_1 = require("@nestjs/common");
const sqlite_storage_service_1 = require("../common/sqlite-storage.service");
const inventory_service_1 = require("./inventory.service");
const uuid_1 = require("uuid");
let ShipmentOrderService = class ShipmentOrderService {
    sqliteStorageService;
    inventoryService;
    constructor(sqliteStorageService, inventoryService) {
        this.sqliteStorageService = sqliteStorageService;
        this.inventoryService = inventoryService;
    }
    create(createDto, userId) {
        this.sqliteStorageService.beginTransaction();
        try {
            const orderNo = this.sqliteStorageService.generateOrderNo('SO');
            const order = this.sqliteStorageService.create('shipmentOrders', {
                orderNo,
                type: createDto.type || 'outbound',
                status: 'pending',
                priority: createDto.priority || 'normal',
                originWarehouseId: createDto.originWarehouseId,
                targetWarehouseId: createDto.targetWarehouseId,
                targetAddress: createDto.targetAddress || '',
                targetCity: createDto.targetCity || '',
                targetProvince: createDto.targetProvince || '',
                targetLongitude: createDto.targetLongitude || 0,
                targetLatitude: createDto.targetLatitude || 0,
                totalQuantity: createDto.items.reduce((sum, item) => sum + item.quantity, 0),
                totalAmount: 0,
                remark: createDto.remark || '',
                createdBy: userId
            });
            for (const item of createDto.items) {
                this.sqliteStorageService.create('shipmentOrderItems', {
                    orderId: order.id,
                    skuId: item.skuId,
                    warehouseId: null,
                    quantity: item.quantity,
                    lockedQuantity: 0,
                    allocatedQuantity: 0,
                    costPrice: 0
                });
            }
            this.sqliteStorageService.commit();
            return this.findOne(order.id);
        }
        catch (error) {
            this.sqliteStorageService.rollback();
            throw error;
        }
    }
    findAllPaginated(page = 1, pageSize = 10, status, type, keyword) {
        let orders = this.sqliteStorageService.findAll('shipmentOrders', {
            field: 'createdAt',
            desc: true
        });
        if (status) {
            orders = orders.filter(o => o.status === status);
        }
        if (type) {
            orders = orders.filter(o => o.type === type);
        }
        if (keyword) {
            const kw = keyword.toLowerCase();
            orders = orders.filter(o => o.orderNo.toLowerCase().includes(kw));
        }
        const warehouses = this.sqliteStorageService.read('warehouses');
        const ordersWithDetail = orders.map(order => ({
            ...order,
            originWarehouseName: warehouses.find(w => w.id === order.originWarehouseId)?.name || 'N/A',
            targetWarehouseName: warehouses.find(w => w.id === order.targetWarehouseId)?.name || 'N/A'
        }));
        const total = ordersWithDetail.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const data = ordersWithDetail.slice(startIndex, endIndex);
        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }
    findOne(id) {
        const order = this.sqliteStorageService.findById('shipmentOrders', id);
        if (!order) {
            throw new common_1.NotFoundException('订单不存在');
        }
        const items = this.sqliteStorageService.findAll('shipmentOrderItems', { orderId: id });
        const skus = this.sqliteStorageService.read('skus');
        const warehouses = this.sqliteStorageService.read('warehouses');
        const itemsWithDetail = items.map(item => ({
            ...item,
            skuCode: skus.find(s => s.id === item.skuId)?.skuCode || 'N/A',
            skuName: skus.find(s => s.id === item.skuId)?.name || 'N/A',
            warehouseName: item.warehouseId ? warehouses.find(w => w.id === item.warehouseId)?.name || 'N/A' : '未分配'
        }));
        return {
            ...order,
            items: itemsWithDetail,
            originWarehouseName: warehouses.find(w => w.id === order.originWarehouseId)?.name || 'N/A',
            targetWarehouseName: warehouses.find(w => w.id === order.targetWarehouseId)?.name || 'N/A'
        };
    }
    findSourceWarehouses(skuId, targetCity, targetProvince, targetLongitude, targetLatitude, quantity) {
        const warehouses = this.sqliteStorageService.findAll('warehouses', { status: 'active' });
        const inventory = this.sqliteStorageService.findAll('inventory', { skuId });
        const availableInventory = inventory.filter(inv => inv.availableQuantity >= quantity);
        const candidates = availableInventory.map(inv => {
            const warehouse = warehouses.find(w => w.id === inv.warehouseId);
            if (!warehouse)
                return null;
            const distance = this.calculateDistance(warehouse.latitude, warehouse.longitude, targetLatitude, targetLongitude);
            return {
                warehouseId: inv.warehouseId,
                warehouseName: warehouse.name,
                warehouseCode: warehouse.code,
                city: warehouse.city,
                province: warehouse.province,
                latitude: warehouse.latitude,
                longitude: warehouse.longitude,
                availableQuantity: inv.availableQuantity,
                quantity: inv.quantity,
                distance,
                priorityScore: this.calculatePriorityScore(warehouse, targetCity, targetProvince, distance)
            };
        }).filter(c => c !== null);
        candidates.sort((a, b) => {
            if (b.priorityScore !== a.priorityScore) {
                return b.priorityScore - a.priorityScore;
            }
            return a.distance - b.distance;
        });
        return candidates;
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2)
            return 999999;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    calculatePriorityScore(warehouse, targetCity, targetProvince, distance) {
        let score = 0;
        if (warehouse.city === targetCity) {
            score += 100;
        }
        if (warehouse.province === targetProvince) {
            score += 50;
        }
        if (distance < 50) {
            score += 30;
        }
        else if (distance < 200) {
            score += 20;
        }
        else if (distance < 500) {
            score += 10;
        }
        return score;
    }
    allocate(orderId) {
        const order = this.findOne(orderId);
        if (order.status !== 'pending') {
            throw new common_1.BadRequestException(`订单状态错误。当前状态: ${order.status}，仅待分配订单可执行分配`);
        }
        this.sqliteStorageService.beginTransaction();
        try {
            const items = this.sqliteStorageService.findAll('shipmentOrderItems', { orderId });
            for (const item of items) {
                const sources = this.findSourceWarehouses(item.skuId, order.targetCity, order.targetProvince, order.targetLongitude, order.targetLatitude, item.quantity);
                if (sources.length === 0) {
                    this.sqliteStorageService.rollback();
                    const sku = this.sqliteStorageService.findById('skus', item.skuId);
                    throw new common_1.BadRequestException(`SKU ${sku?.skuCode || item.skuId} 库存不足，无法分配`);
                }
                const bestSource = sources[0];
                this.inventoryService.lock(bestSource.warehouseId, item.skuId, item.quantity, 'order_allocate', orderId, `订单 ${order.orderNo} 分配锁定`);
                this.sqliteStorageService.update('shipmentOrderItems', item.id, {
                    warehouseId: bestSource.warehouseId,
                    lockedQuantity: item.quantity,
                    costPrice: 0
                });
            }
            this.sqliteStorageService.update('shipmentOrders', orderId, {
                status: 'allocated'
            });
            this.sqliteStorageService.commit();
            return this.findOne(orderId);
        }
        catch (error) {
            this.sqliteStorageService.rollback();
            throw error;
        }
    }
    ship(orderId, userId) {
        const order = this.findOne(orderId);
        if (order.status !== 'allocated') {
            throw new common_1.BadRequestException(`订单状态错误。当前状态: ${order.status}，仅已分配订单可执行发货`);
        }
        this.sqliteStorageService.beginTransaction();
        try {
            const items = this.sqliteStorageService.findAll('shipmentOrderItems', { orderId });
            for (const item of items) {
                if (!item.warehouseId) {
                    continue;
                }
                this.inventoryService.deduct(item.warehouseId, item.skuId, item.lockedQuantity, 'order_ship', orderId, `订单 ${order.orderNo} 发货扣减`);
                this.sqliteStorageService.update('shipmentOrderItems', item.id, {
                    allocatedQuantity: item.lockedQuantity,
                    lockedQuantity: 0
                });
            }
            this.sqliteStorageService.update('shipmentOrders', orderId, {
                status: 'shipped',
                shippedBy: userId
            });
            this.sqliteStorageService.commit();
            return this.findOne(orderId);
        }
        catch (error) {
            this.sqliteStorageService.rollback();
            throw error;
        }
    }
    cancel(orderId, userId) {
        const order = this.findOne(orderId);
        const validStatuses = ['pending', 'allocated'];
        if (!validStatuses.includes(order.status)) {
            throw new common_1.BadRequestException(`订单状态错误。当前状态: ${order.status}，仅待分配或已分配订单可取消`);
        }
        this.sqliteStorageService.beginTransaction();
        try {
            if (order.status === 'allocated') {
                const items = this.sqliteStorageService.findAll('shipmentOrderItems', { orderId });
                for (const item of items) {
                    if (item.warehouseId && item.lockedQuantity > 0) {
                        this.inventoryService.release(item.warehouseId, item.skuId, item.lockedQuantity, 'order_cancel', orderId, `订单 ${order.orderNo} 取消释放`);
                        this.sqliteStorageService.update('shipmentOrderItems', item.id, {
                            warehouseId: null,
                            lockedQuantity: 0
                        });
                    }
                }
            }
            this.sqliteStorageService.update('shipmentOrders', orderId, {
                status: 'cancelled',
                cancelledBy: userId
            });
            this.sqliteStorageService.commit();
            return this.findOne(orderId);
        }
        catch (error) {
            this.sqliteStorageService.rollback();
            throw error;
        }
    }
    getStatistics() {
        const orders = this.sqliteStorageService.read('shipmentOrders');
        const items = this.sqliteStorageService.read('shipmentOrderItems');
        const total = orders.length;
        const pending = orders.filter(o => o.status === 'pending').length;
        const allocated = orders.filter(o => o.status === 'allocated').length;
        const shipped = orders.filter(o => o.status === 'shipped').length;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;
        const outbound = orders.filter(o => o.type === 'outbound').length;
        const transfer = orders.filter(o => o.type === 'transfer').length;
        const highPriority = orders.filter(o => o.priority === 'high').length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
        const typeStats = [
            { type: 'outbound', label: '出库单', count: outbound },
            { type: 'transfer', label: '调拨单', count: transfer }
        ];
        const statusStats = [
            { status: 'pending', label: '待分配', count: pending, color: '#faad14' },
            { status: 'allocated', label: '已分配', count: allocated, color: '#1890ff' },
            { status: 'shipped', label: '已发货', count: shipped, color: '#52c41a' },
            { status: 'cancelled', label: '已取消', count: cancelled, color: '#999999' }
        ];
        return {
            total,
            pending,
            allocated,
            shipped,
            cancelled,
            typeStats,
            statusStats,
            highPriority,
            todayCount: todayOrders.length
        };
    }
    getTraceability(sourceId, sourceType) {
        const logs = this.sqliteStorageService.findAll('inventoryLogs', {
            field: 'createdAt',
            desc: true
        }).filter(log => log.sourceId === sourceId);
        const warehouses = this.sqliteStorageService.read('warehouses');
        const skus = this.sqliteStorageService.read('skus');
        return logs.map(log => ({
            ...log,
            warehouseName: warehouses.find(w => w.id === log.warehouseId)?.name || 'N/A',
            skuCode: skus.find(s => s.id === log.skuId)?.skuCode || 'N/A',
            skuName: skus.find(s => s.id === log.skuId)?.name || 'N/A'
        }));
    }
};
exports.ShipmentOrderService = ShipmentOrderService;
exports.ShipmentOrderService = ShipmentOrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sqlite_storage_service_1.SqliteStorageService, inventory_service_1.InventoryService])
], ShipmentOrderService);
