"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const db_1 = require("../config/db");
const redis_1 = require("../config/redis");
const CACHE_TTL = 900; // 15 minutes
const authMiddleware = async (req, res, next) => {
    try {
        // Exclude specific public routes if needed, e.g. convert API that doesn't need auth
        if (req.originalUrl.includes('convert')) {
            return next();
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, jwt_1.verifyToken)(token);
        const cacheKey = `user:${decoded.userId}`;
        let userWithoutPassword = null;
        const cached = await redis_1.cacheService.get(cacheKey);
        if (cached) {
            try {
                userWithoutPassword = JSON.parse(cached);
            }
            catch {
                userWithoutPassword = null;
            }
        }
        if (!userWithoutPassword) {
            const user = await db_1.prisma.user.findUnique({
                where: { id: decoded.userId },
            });
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized: User not found' });
            }
            const { password, ...rest } = user;
            userWithoutPassword = rest;
            await redis_1.cacheService.set(cacheKey, JSON.stringify(userWithoutPassword), CACHE_TTL);
        }
        req.user = userWithoutPassword;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
exports.authMiddleware = authMiddleware;
