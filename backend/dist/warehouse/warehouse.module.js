"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarehouseModule = void 0;
const common_1 = require("@nestjs/common");
const warehouse_service_1 = require("./warehouse.service");
const warehouse_controller_1 = require("./warehouse.controller");
const sku_service_1 = require("./sku.service");
const sku_controller_1 = require("./sku.controller");
const inventory_service_1 = require("./inventory.service");
const inventory_controller_1 = require("./inventory.controller");
const shipment_order_service_1 = require("./shipment-order.service");
const shipment_order_controller_1 = require("./shipment-order.controller");
const data_factory_service_1 = require("./data-factory.service");
const data_factory_controller_1 = require("./data-factory.controller");
let WarehouseModule = class WarehouseModule {
};
exports.WarehouseModule = WarehouseModule;
exports.WarehouseModule = WarehouseModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            warehouse_controller_1.WarehouseController,
            sku_controller_1.SkuController,
            inventory_controller_1.InventoryController,
            shipment_order_controller_1.ShipmentOrderController,
            data_factory_controller_1.DataFactoryController
        ],
        providers: [
            warehouse_service_1.WarehouseService,
            sku_service_1.SkuService,
            inventory_service_1.InventoryService,
            shipment_order_service_1.ShipmentOrderService,
            data_factory_service_1.DataFactoryService
        ],
        exports: [
            warehouse_service_1.WarehouseService,
            sku_service_1.SkuService,
            inventory_service_1.InventoryService,
            shipment_order_service_1.ShipmentOrderService
        ]
    })
], WarehouseModule);
