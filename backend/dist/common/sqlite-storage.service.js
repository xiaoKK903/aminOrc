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
exports.SqliteStorageService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const uuid_1 = require("uuid");
const TABLES = {
    warehouses: {
        name: 'warehouses',
        primaryKey: 'id',
        autoIncrement: false,
        columns: ['id', 'name', 'code', 'address', 'city', 'province', 'longitude', 'latitude', 'capacity', 'status', 'createdAt', 'updatedAt'],
        indexes: ['code', 'city', 'status']
    },
    skus: {
        name: 'skus',
        primaryKey: 'id',
        autoIncrement: false,
        columns: ['id', 'skuCode', 'name', 'category', 'unit', 'specification', 'minStock', 'maxStock', 'safetyStock', 'status', 'createdAt', 'updatedAt'],
        indexes: ['skuCode', 'category', 'status']
    },
    inventory: {
        name: 'inventory',
        primaryKey: 'id',
        autoIncrement: false,
        columns: ['id', 'warehouseId', 'skuId', 'quantity', 'lockedQuantity', 'availableQuantity', 'avgCost', 'lastUpdated'],
        indexes: ['warehouseId', 'skuId']
    },
    inventoryShards: {
        name: 'inventoryShards',
        primaryKey: 'id',
        autoIncrement: false,
        columns: ['id', 'warehouseId', 'skuId', 'shardNo', 'quantity', 'lockedQuantity', 'status', 'createdAt', 'updatedAt'],
        indexes: ['warehouseId', 'skuId', 'shardNo']
    },
    shipmentOrders: {
        name: 'shipmentOrders',
        primaryKey: 'id',
        autoIncrement: false,
        columns: ['id', 'orderNo', 'type', 'status', 'priority', 'originWarehouseId', 'targetWarehouseId', 'targetAddress', 'targetCity', 'targetProvince', 'targetLongitude', 'targetLatitude', 'totalQuantity', 'totalAmount', 'remark', 'createdAt', 'updatedAt'],
        indexes: ['orderNo', 'status', 'originWarehouseId', 'targetWarehouseId', 'createdAt']
    },
    shipmentOrderItems: {
        name: 'shipmentOrderItems',
        primaryKey: 'id',
        autoIncrement: false,
        columns: ['id', 'orderId', 'skuId', 'warehouseId', 'quantity', 'lockedQuantity', 'allocatedQuantity', 'costPrice', 'createdAt'],
        indexes: ['orderId', 'skuId', 'warehouseId']
    },
    inventoryLogs: {
        name: 'inventoryLogs',
        primaryKey: 'id',
        autoIncrement: false,
        columns: ['id', 'warehouseId', 'skuId', 'type', 'quantity', 'beforeQuantity', 'afterQuantity', 'beforeLocked', 'afterLocked', 'sourceType', 'sourceId', 'remark', 'createdAt'],
        indexes: ['warehouseId', 'skuId', 'type', 'sourceType', 'sourceId', 'createdAt']
    }
};
let SqliteStorageService = class SqliteStorageService {
    dataPath;
    transactions = [];
    inTransaction = false;
    transactionData = {};
    constructor() {
        this.dataPath = path.join(process.cwd(), 'data');
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
        this.initializeTables();
    }
    initializeTables() {
        for (const tableName of Object.keys(TABLES)) {
            const filePath = this.getTablePath(tableName);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
            }
        }
    }
    getTablePath(tableName) {
        return path.join(this.dataPath, `${tableName}.json`);
    }
    validateTable(tableName) {
        if (!TABLES[tableName]) {
            throw new common_1.NotFoundException(`表 ${tableName} 不存在`);
        }
    }
    read(tableName) {
        this.validateTable(tableName);
        if (this.inTransaction && this.transactionData[tableName]) {
            return [...this.transactionData[tableName]];
        }
        const filePath = this.getTablePath(tableName);
        try {
            if (!fs.existsSync(filePath)) {
                return [];
            }
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            console.error(`Error reading ${tableName}:`, error);
            return [];
        }
    }
    write(tableName, data) {
        this.validateTable(tableName);
        if (this.inTransaction) {
            this.transactionData[tableName] = [...data];
            return;
        }
        const filePath = this.getTablePath(tableName);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        }
        catch (error) {
            console.error(`Error writing ${tableName}:`, error);
            throw error;
        }
    }
    beginTransaction() {
        this.inTransaction = true;
        this.transactionData = {};
        for (const tableName of Object.keys(TABLES)) {
            this.transactionData[tableName] = this.read(tableName);
        }
    }
    commit() {
        if (!this.inTransaction) {
            return;
        }
        for (const tableName of Object.keys(this.transactionData)) {
            const filePath = this.getTablePath(tableName);
            fs.writeFileSync(filePath, JSON.stringify(this.transactionData[tableName], null, 2), 'utf8');
        }
        this.inTransaction = false;
        this.transactionData = {};
    }
    rollback() {
        if (!this.inTransaction) {
            return;
        }
        this.inTransaction = false;
        this.transactionData = {};
    }
    findById(tableName, id) {
        const items = this.read(tableName);
        return items.find(item => item.id === id) || null;
    }
    findOne(tableName, where = {}) {
        const items = this.read(tableName);
        return items.find(item => {
            for (const [key, value] of Object.entries(where)) {
                if (item[key] !== value) {
                    return false;
                }
            }
            return true;
        }) || null;
    }
    findAll(tableName, where = {}, orderBy = null) {
        let items = this.read(tableName);
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
        if (orderBy) {
            items.sort((a, b) => {
                if (orderBy.desc) {
                    return b[orderBy.field] > a[orderBy.field] ? 1 : -1;
                }
                return a[orderBy.field] > b[orderBy.field] ? 1 : -1;
            });
        }
        return items;
    }
    create(tableName, item) {
        const tableConfig = TABLES[tableName];
        const now = new Date().toISOString();
        const newItem = {
            ...item,
            id: item.id || (0, uuid_1.v4)()
        };
        if (tableConfig.columns.includes('createdAt')) {
            newItem.createdAt = now;
        }
        if (tableConfig.columns.includes('updatedAt')) {
            newItem.updatedAt = now;
        }
        const items = this.read(tableName);
        items.push(newItem);
        this.write(tableName, items);
        return newItem;
    }
    update(tableName, id, updates) {
        const tableConfig = TABLES[tableName];
        const items = this.read(tableName);
        const index = items.findIndex(item => item.id === id);
        if (index === -1) {
            return null;
        }
        const now = new Date().toISOString();
        items[index] = {
            ...items[index],
            ...updates
        };
        if (tableConfig.columns.includes('updatedAt')) {
            items[index].updatedAt = now;
        }
        this.write(tableName, items);
        return items[index];
    }
    delete(tableName, id) {
        const items = this.read(tableName);
        const filteredItems = items.filter(item => item.id !== id);
        if (filteredItems.length === items.length) {
            return false;
        }
        this.write(tableName, filteredItems);
        return true;
    }
    count(tableName, where = {}) {
        const items = this.read(tableName);
        if (Object.keys(where).length === 0) {
            return items.length;
        }
        return items.filter(item => {
            for (const [key, value] of Object.entries(where)) {
                if (item[key] !== value) {
                    return false;
                }
            }
            return true;
        }).length;
    }
    sum(tableName, field, where = {}) {
        const items = this.read(tableName);
        return items
            .filter(item => {
            if (Object.keys(where).length === 0) {
                return true;
            }
            for (const [key, value] of Object.entries(where)) {
                if (item[key] !== value) {
                    return false;
                }
            }
            return true;
        })
            .reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
    }
    paginate(tableName, where = {}, page = 1, pageSize = 10, orderBy = null) {
        const items = this.findAll(tableName, where, orderBy);
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
    generateOrderNo(prefix = 'SO') {
        const now = new Date();
        const dateStr = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0');
        const timeStr = now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}${dateStr}${timeStr}${random}`;
    }
    rawQuery(tableName, filterFn) {
        const items = this.read(tableName);
        return items.filter(filterFn);
    }
};
exports.SqliteStorageService = SqliteStorageService;
exports.SqliteStorageService = SqliteStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SqliteStorageService);
