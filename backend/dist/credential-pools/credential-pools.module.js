"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialPoolsModule = void 0;
const common_1 = require("@nestjs/common");
const credential_pools_controller_1 = require("./credential-pools.controller");
const credential_pools_service_1 = require("./credential-pools.service");
const json_storage_service_1 = require("../common/json-storage.service");
let CredentialPoolsModule = class CredentialPoolsModule {
};
exports.CredentialPoolsModule = CredentialPoolsModule;
exports.CredentialPoolsModule = CredentialPoolsModule = __decorate([
    (0, common_1.Module)({
        controllers: [credential_pools_controller_1.CredentialPoolsController],
        providers: [credential_pools_service_1.CredentialPoolsService, json_storage_service_1.JsonStorageService],
    })
], CredentialPoolsModule);
//# sourceMappingURL=credential-pools.module.js.map