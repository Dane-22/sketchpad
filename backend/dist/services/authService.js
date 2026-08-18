"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const db_1 = require("../config/db");
const passwordHash_1 = require("../utils/passwordHash");
const jwt_1 = require("../utils/jwt");
const redis_1 = require("../config/redis");
const CACHE_TTL = 900; // 15 minutes
exports.authService = {
    async register(data) {
        const existingUser = await db_1.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new Error('Email is already in use');
        }
        const hashedPassword = await (0, passwordHash_1.hashPassword)(data.password);
        const user = await db_1.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                fullName: data.fullName,
                role: data.role || 'ENGINEER',
            },
        });
        const { password, ...userWithoutPassword } = user;
        const token = (0, jwt_1.generateToken)({ userId: user.id, role: user.role });
        await redis_1.cacheService.set(`user:${user.id}`, JSON.stringify(userWithoutPassword), CACHE_TTL);
        return { user: userWithoutPassword, token };
    },
    async login(data) {
        const user = await db_1.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (!user) {
            throw new Error('Invalid email or password');
        }
        const isPasswordValid = await (0, passwordHash_1.comparePassword)(data.password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }
        const { password, ...userWithoutPassword } = user;
        const token = (0, jwt_1.generateToken)({ userId: user.id, role: user.role });
        await redis_1.cacheService.set(`user:${user.id}`, JSON.stringify(userWithoutPassword), CACHE_TTL);
        return { user: userWithoutPassword, token };
    },
};
