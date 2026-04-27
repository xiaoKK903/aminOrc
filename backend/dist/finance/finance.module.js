"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceModule = void 0;
const common_1 = require("@nestjs/common");
const budget_controller_1 = require("./budget.controller");
const budget_service_1 = require("./budget.service");
const fee_control_controller_1 = require("./fee-control.controller");
const fee_control_service_1 = require("./fee-control.service");
const reimbursement_controller_1 = require("./reimbursement.controller");
const reimbursement_service_1 = require("./reimbursement.service");
const bill_controller_1 = require("./bill.controller");
const bill_service_1 = require("./bill.service");
const json_storage_service_1 = require("../common/json-storage.service");
let FinanceModule = class FinanceModule {
};
exports.FinanceModule = FinanceModule;
exports.FinanceModule = FinanceModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            budget_controller_1.BudgetController,
            fee_control_controller_1.FeeControlController,
            reimbursement_controller_1.ReimbursementController,
            bill_controller_1.BillController,
        ],
        providers: [
            budget_service_1.BudgetService,
            fee_control_service_1.FeeControlService,
            reimbursement_service_1.ReimbursementService,
            bill_service_1.BillService,
            json_storage_service_1.JsonStorageService,
        ],
        exports: [
            budget_service_1.BudgetService,
            fee_control_service_1.FeeControlService,
            reimbursement_service_1.ReimbursementService,
            bill_service_1.BillService,
        ],
    })
], FinanceModule);
