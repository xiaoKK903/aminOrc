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
exports.DataFactoryService = void 0;
const common_1 = require("@nestjs/common");
const sqlite_storage_service_1 = require("../common/sqlite-storage.service");
const inventory_service_1 = require("./inventory.service");
const uuid_1 = require("uuid");
const WAREHOUSE_DATA = [
    { name: '华东仓储中心', code: 'WH-HD-01', city: '上海', province: '上海市', longitude: 121.4737, latitude: 31.2304, capacity: 500000 },
    { name: '华南仓储中心', code: 'WH-HN-01', city: '广州', province: '广东省', longitude: 113.2644, latitude: 23.1291, capacity: 400000 },
    { name: '华北仓储中心', code: 'WH-HB-01', city: '北京', province: '北京市', longitude: 116.4074, latitude: 39.9042, capacity: 450000 },
    { name: '西南仓储中心', code: 'WH-XN-01', city: '成都', province: '四川省', longitude: 104.0668, latitude: 30.5728, capacity: 350000 },
    { name: '华中仓储中心', code: 'WH-HZ-01', city: '武汉', province: '湖北省', longitude: 114.3055, latitude: 30.5931, capacity: 380000 },
    { name: '西北仓储中心', code: 'WH-XB-01', city: '西安', province: '陕西省', longitude: 108.9398, latitude: 34.3416, capacity: 250000 },
    { name: '华东分仓-杭州', code: 'WH-HD-02', city: '杭州', province: '浙江省', longitude: 120.1551, latitude: 30.2741, capacity: 200000 },
    { name: '华南分仓-深圳', code: 'WH-HN-02', city: '深圳', province: '广东省', longitude: 114.0579, latitude: 22.5431, capacity: 220000 }
];
const SKU_CATEGORIES = [
    { code: 'electronics', name: '电子产品' },
    { code: 'clothing', name: '服装鞋帽' },
    { code: 'food', name: '食品饮料' },
    { code: 'home', name: '家居用品' },
    { code: 'beauty', name: '美妆个护' },
    { code: 'office', name: '办公用品' }
];
const SKU_DATA = [
    { name: 'iPhone 15 Pro 256GB', unit: '台', specification: '黑色钛金属', minStock: 50, maxStock: 500, safetyStock: 100, category: 'electronics' },
    { name: 'iPhone 15 Pro 512GB', unit: '台', specification: '白色钛金属', minStock: 30, maxStock: 300, safetyStock: 60, category: 'electronics' },
    { name: 'MacBook Pro 14寸', unit: '台', specification: 'M3 Pro/16GB/512GB', minStock: 20, maxStock: 200, safetyStock: 40, category: 'electronics' },
    { name: 'iPad Pro 12.9寸', unit: '台', specification: 'M2/256GB', minStock: 30, maxStock: 250, safetyStock: 60, category: 'electronics' },
    { name: 'AirPods Pro 2代', unit: '副', specification: 'USB-C', minStock: 100, maxStock: 1000, safetyStock: 200, category: 'electronics' },
    { name: 'Apple Watch Series 9', unit: '只', specification: '45mm/GPS', minStock: 80, maxStock: 800, safetyStock: 160, category: 'electronics' },
    { name: '商务正装西服', unit: '套', specification: '藏青色/175', minStock: 50, maxStock: 500, safetyStock: 100, category: 'clothing' },
    { name: '休闲牛仔裤', unit: '条', specification: '蓝色/32码', minStock: 80, maxStock: 800, safetyStock: 160, category: 'clothing' },
    { name: '运动T恤', unit: '件', specification: '白色/L码', minStock: 150, maxStock: 1500, safetyStock: 300, category: 'clothing' },
    { name: '跑步运动鞋', unit: '双', specification: '黑色/42码', minStock: 100, maxStock: 1000, safetyStock: 200, category: 'clothing' },
    { name: '有机牛奶 1L', unit: '盒', specification: '全脂', minStock: 200, maxStock: 2000, safetyStock: 400, category: 'food' },
    { name: '进口红酒 750ml', unit: '瓶', specification: '波尔多AOC', minStock: 50, maxStock: 500, safetyStock: 100, category: 'food' },
    { name: '进口巧克力礼盒', unit: '盒', specification: '瑞士莲', minStock: 80, maxStock: 800, safetyStock: 160, category: 'food' },
    { name: '北欧简约沙发', unit: '套', specification: '三人位/灰色', minStock: 10, maxStock: 100, safetyStock: 20, category: 'home' },
    { name: '智能床头柜', unit: '个', specification: '带无线充电', minStock: 20, maxStock: 200, safetyStock: 40, category: 'home' },
    { name: 'LED护眼台灯', unit: '台', specification: '可调节亮度', minStock: 60, maxStock: 600, safetyStock: 120, category: 'home' },
    { name: 'SK-II神仙水 230ml', unit: '瓶', specification: '经典款', minStock: 40, maxStock: 400, safetyStock: 80, category: 'beauty' },
    { name: '雅诗兰黛小棕瓶精华', unit: '瓶', specification: '50ml', minStock: 50, maxStock: 500, safetyStock: 100, category: 'beauty' },
    { name: '纪梵希散粉', unit: '盒', specification: '1号色', minStock: 60, maxStock: 600, safetyStock: 120, category: 'beauty' },
    { name: '得力中性笔 0.5mm', unit: '盒', specification: '12支装/黑色', minStock: 200, maxStock: 2000, safetyStock: 400, category: 'office' },
    { name: '惠普激光打印机', unit: '台', specification: 'M404dn', minStock: 15, maxStock: 150, safetyStock: 30, category: 'office' },
    { name: '得力文件柜', unit: '个', specification: '四层/灰色', minStock: 30, maxStock: 300, safetyStock: 60, category: 'office' }
];
const ADDRESSES = [
    { city: '南京', province: '江苏省', longitude: 118.7969, latitude: 32.0617 },
    { city: '苏州', province: '江苏省', longitude: 120.6199, latitude: 31.2990 },
    { city: '无锡', province: '江苏省', longitude: 120.3119, latitude: 31.4912 },
    { city: '东莞', province: '广东省', longitude: 113.7518, latitude: 23.0207 },
    { city: '佛山', province: '广东省', longitude: 113.1227, latitude: 23.0288 },
    { city: '天津', province: '天津市', longitude: 117.2008, latitude: 39.0842 },
    { city: '石家庄', province: '河北省', longitude: 114.5149, latitude: 38.0428 },
    { city: '重庆', province: '重庆市', longitude: 106.504962, latitude: 29.533155 },
    { city: '长沙', province: '湖南省', longitude: 112.9388, latitude: 28.2282 },
    { city: '郑州', province: '河南省', longitude: 113.6254, latitude: 34.7466 }
];
let DataFactoryService = class DataFactoryService {
    sqliteStorageService;
    inventoryService;
    constructor(sqliteStorageService, inventoryService) {
        this.sqliteStorageService = sqliteStorageService;
        this.inventoryService = inventoryService;
    }
    hasData() {
        const warehouses = this.sqliteStorageService.read('warehouses');
        const skus = this.sqliteStorageService.read('skus');
        const inventory = this.sqliteStorageService.read('inventory');
        return warehouses.length > 0 || skus.length > 0 || inventory.length > 0;
    }
    generateAll(warehouseCount = 5, skuCount = 15, orderCount = 20, userId = null) {
        this.sqliteStorageService.beginTransaction();
        try {
            const createdWarehouses = this.generateWarehouses(warehouseCount, userId);
            const createdSkus = this.generateSkus(skuCount, userId);
            const createdInventory = this.generateInventory(createdWarehouses, createdSkus);
            const createdOrders = this.generateOrders(orderCount, createdWarehouses, createdSkus, userId);
            this.sqliteStorageService.commit();
            return {
                success: true,
                message: '仿真数据生成成功',
                warehouses: { count: createdWarehouses.length },
                skus: { count: createdSkus.length },
                inventory: { count: createdInventory.length },
                orders: { count: createdOrders.length }
            };
        }
        catch (error) {
            this.sqliteStorageService.rollback();
            throw error;
        }
    }
    generateWarehouses(count = 5, userId = null) {
        const warehouses = [];
        const warehousePool = [...WAREHOUSE_DATA];
        for (let i = 0; i < Math.min(count, warehousePool.length); i++) {
            const data = warehousePool[i];
            const warehouse = this.sqliteStorageService.create('warehouses', {
                name: data.name,
                code: data.code,
                address: `${data.province}${data.city}经济技术开发区仓储大道${100 + i}号`,
                city: data.city,
                province: data.province,
                longitude: data.longitude,
                latitude: data.latitude,
                capacity: data.capacity,
                status: 'active',
                createdBy: userId
            });
            warehouses.push(warehouse);
        }
        return warehouses;
    }
    generateSkus(count = 15, userId = null) {
        const skus = [];
        const skuPool = [...SKU_DATA];
        for (let i = 0; i < Math.min(count, skuPool.length); i++) {
            const data = skuPool[i];
            const category = SKU_CATEGORIES.find(c => c.code === data.category);
            const sku = this.sqliteStorageService.create('skus', {
                skuCode: `SKU-${String(i + 1).padStart(6, '0')}`,
                name: data.name,
                category: category?.code || 'default',
                unit: data.unit,
                specification: data.specification,
                minStock: data.minStock,
                maxStock: data.maxStock,
                safetyStock: data.safetyStock,
                status: 'active',
                createdBy: userId
            });
            skus.push(sku);
        }
        return skus;
    }
    generateInventory(warehouses, skus) {
        const inventory = [];
        for (const warehouse of warehouses) {
            const skuCount = Math.floor(Math.random() * (skus.length * 0.6)) + Math.floor(skus.length * 0.4);
            const shuffledSkus = [...skus].sort(() => Math.random() - 0.5);
            for (let i = 0; i < Math.min(skuCount, shuffledSkus.length); i++) {
                const sku = shuffledSkus[i];
                const baseQuantity = Math.floor(Math.random() * 500) + 100;
                const quantity = Math.floor(Math.random() * baseQuantity) + sku.safetyStock;
                const inv = this.sqliteStorageService.create('inventory', {
                    warehouseId: warehouse.id,
                    skuId: sku.id,
                    quantity,
                    lockedQuantity: 0,
                    availableQuantity: quantity,
                    avgCost: Math.floor(Math.random() * 5000) + 100
                });
                inventory.push(inv);
            }
        }
        return inventory;
    }
    generateOrders(count = 20, warehouses, skus, userId = null) {
        const orders = [];
        const allInventory = this.sqliteStorageService.read('inventory');
        const inventoryBySku = new Map();
        allInventory.forEach(inv => {
            if (!inventoryBySku.has(inv.skuId)) {
                inventoryBySku.set(inv.skuId, []);
            }
            inventoryBySku.get(inv.skuId).push(inv);
        });
        const availableSkus = skus.filter(sku => inventoryBySku.has(sku.id));
        const orderTypes = ['outbound', 'transfer'];
        const priorities = ['normal', 'high', 'urgent'];
        const statuses = ['pending', 'allocated', 'shipped', 'cancelled'];
        for (let i = 0; i < count; i++) {
            const address = ADDRESSES[Math.floor(Math.random() * ADDRESSES.length)];
            const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
            const priority = Math.random() > 0.8 ? (Math.random() > 0.5 ? 'urgent' : 'high') : 'normal';
            const status = Math.random() > 0.3 ? statuses[Math.floor(Math.random() * (statuses.length - 1))] : 'pending';
            const itemCount = Math.floor(Math.random() * 3) + 1;
            const orderItems = [];
            for (let j = 0; j < itemCount; j++) {
                const sku = availableSkus[Math.floor(Math.random() * availableSkus.length)];
                const skuInventory = inventoryBySku.get(sku.id);
                if (!skuInventory || skuInventory.length === 0)
                    continue;
                const inv = skuInventory[Math.floor(Math.random() * skuInventory.length)];
                const quantity = Math.floor(Math.random() * Math.min(50, inv.availableQuantity / 3)) + 1;
                orderItems.push({
                    skuId: sku.id,
                    quantity,
                    warehouseId: inv.warehouseId
                });
            }
            if (orderItems.length === 0)
                continue;
            const createDto = {
                type: orderType,
                priority,
                targetAddress: `${address.province}${address.city}某某区某某路${Math.floor(Math.random() * 100) + 1}号`,
                targetCity: address.city,
                targetProvince: address.province,
                targetLongitude: address.longitude,
                targetLatitude: address.latitude,
                items: orderItems.map(item => ({
                    skuId: item.skuId,
                    quantity: item.quantity
                })),
                remark: `仿真订单 ${i + 1}`
            };
            if (orderType === 'transfer') {
                const originWarehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
                const targetWarehouse = warehouses.filter(w => w.id !== originWarehouse.id)[Math.floor(Math.random() * (warehouses.length - 1))];
                createDto.originWarehouseId = originWarehouse.id;
                createDto.targetWarehouseId = targetWarehouse?.id;
            }
            this.sqliteStorageService.beginTransaction();
            try {
                const orderNo = this.sqliteStorageService.generateOrderNo('SO');
                const order = this.sqliteStorageService.create('shipmentOrders', {
                    orderNo,
                    type: createDto.type || 'outbound',
                    status: status,
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
                for (let j = 0; j < createDto.items.length; j++) {
                    const item = createDto.items[j];
                    const orderItem = orderItems[j];
                    let warehouseId = null;
                    let lockedQuantity = 0;
                    if (status === 'allocated' || status === 'shipped') {
                        warehouseId = orderItem.warehouseId;
                        lockedQuantity = item.quantity;
                        if (status === 'shipped') {
                            const inv = allInventory.find(inv => inv.warehouseId === warehouseId && inv.skuId === item.skuId);
                            if (inv && inv.availableQuantity >= item.quantity) {
                                const newQuantity = inv.quantity - item.quantity;
                                this.sqliteStorageService.update('inventory', inv.id, {
                                    quantity: newQuantity,
                                    availableQuantity: newQuantity
                                });
                                this.sqliteStorageService.create('inventoryLogs', {
                                    warehouseId,
                                    skuId: item.skuId,
                                    type: 'deduct',
                                    quantity: item.quantity,
                                    beforeQuantity: inv.quantity,
                                    afterQuantity: newQuantity,
                                    beforeLocked: 0,
                                    afterLocked: 0,
                                    sourceType: 'order_ship',
                                    sourceId: order.id,
                                    remark: `仿真订单发货扣减`
                                });
                                lockedQuantity = 0;
                            }
                        }
                    }
                    this.sqliteStorageService.create('shipmentOrderItems', {
                        orderId: order.id,
                        skuId: item.skuId,
                        warehouseId,
                        quantity: item.quantity,
                        lockedQuantity,
                        allocatedQuantity: status === 'shipped' ? item.quantity : 0,
                        costPrice: 0
                    });
                }
                this.sqliteStorageService.commit();
                orders.push(order);
            }
            catch (error) {
                this.sqliteStorageService.rollback();
                console.error('生成订单失败:', error);
            }
        }
        return orders;
    }
    clearAll() {
        this.sqliteStorageService.write('warehouses', []);
        this.sqliteStorageService.write('skus', []);
        this.sqliteStorageService.write('inventory', []);
        this.sqliteStorageService.write('inventoryShards', []);
        this.sqliteStorageService.write('shipmentOrders', []);
        this.sqliteStorageService.write('shipmentOrderItems', []);
        this.sqliteStorageService.write('inventoryLogs', []);
        return {
            success: true,
            message: '所有数据已清除'
        };
    }
};
exports.DataFactoryService = DataFactoryService;
exports.DataFactoryService = DataFactoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sqlite_storage_service_1.SqliteStorageService, inventory_service_1.InventoryService])
], DataFactoryService);
