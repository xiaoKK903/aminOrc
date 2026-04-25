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
exports.TicketAssignService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const fs = require("fs");
const path = require("path");
const DATA_FILE = path.join(__dirname, '../../data/ticket-assign.json');
const CHANNEL_DATA = {
    '官网': [
        { id: 'o1', name: '张三', value: 'zhangsan' },
        { id: 'o2', name: '李四', value: 'lisi' },
        { id: 'o3', name: '王五', value: 'wangwu' },
    ],
    'App': [
        { id: 'a1', name: '赵六', value: 'zhaoliu' },
        { id: 'a2', name: '钱七', value: 'qianqi' },
        { id: 'a3', name: '孙八', value: 'sunba' },
    ],
    '微信群': [
        { id: 'w1', name: '周九', value: 'zhoujiu' },
        { id: 'w2', name: '吴十', value: 'wushi' },
        { id: 'w3', name: '郑十一', value: 'zheng11' },
        { id: 'w4', name: '王十二', value: 'wang12' },
    ],
};
const CHANNELS = [
    { id: 'official', name: '官网', value: '官网' },
    { id: 'app', name: 'App', value: 'App' },
    { id: 'wechat', name: '微信群', value: '微信群' },
];
function readTickets() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(data);
        }
        return [];
    }
    catch (e) {
        console.error('读取工单数据失败:', e);
        return [];
    }
}
function saveTickets(tickets) {
    try {
        const dataDir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2), 'utf-8');
    }
    catch (e) {
        console.error('保存工单数据失败:', e);
    }
}
let TicketAssignService = class TicketAssignService {
    getChannels() {
        return CHANNELS;
    }
    getOwnersByChannel(channel) {
        if (!channel) {
            return [];
        }
        return CHANNEL_DATA[channel] || [];
    }
    validateOwner(channel, ownerValue) {
        if (!channel || !ownerValue) {
            return false;
        }
        const owners = this.getOwnersByChannel(channel);
        return owners.some(o => o.value === ownerValue);
    }
    assignTicket(channel, ownerValue, ownerName, userId, userName) {
        if (!this.validateOwner(channel, ownerValue)) {
            throw new common_1.BadRequestException('负责人与渠道不匹配');
        }
        const ticket = {
            id: (0, uuid_1.v4)(),
            channel: channel,
            ownerValue: ownerValue,
            ownerName: ownerName,
            assignedBy: userId,
            assignedByName: userName,
            assignedAt: new Date().toISOString(),
            status: 'assigned',
        };
        const tickets = readTickets();
        tickets.unshift(ticket);
        saveTickets(tickets);
        return ticket;
    }
    getTickets(userId, userRole) {
        const tickets = readTickets();
        if (userRole === 'admin') {
            return tickets;
        }
        return tickets.filter(t => t.assignedBy === userId);
    }
};
exports.TicketAssignService = TicketAssignService;
exports.TicketAssignService = TicketAssignService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TicketAssignService);
