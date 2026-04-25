"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemporaryAccessModule = void 0;
const common_1 = require("@nestjs/common");
const temporary_access_controller_1 = require("./temporary-access.controller");
const temporary_access_service_1 = require("./temporary-access.service");
const json_storage_service_1 = require("../common/json-storage.service");
let TemporaryAccessModule = class TemporaryAccessModule {
};
exports.TemporaryAccessModule = TemporaryAccessModule;
exports.TemporaryAccessModule = TemporaryAccessModule = __decorate([
    (0, common_1.Module)({
        controllers: [temporary_access_controller_1.TemporaryAccessController],
        providers: [temporary_access_service_1.TemporaryAccessService, json_storage_service_1.JsonStorageService],
    })
], TemporaryAccessModule);
