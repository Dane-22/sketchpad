"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT || 5000,
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET || 'super-secret-key-for-dev-only-change-in-prod',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    nodeEnv: process.env.NODE_ENV || 'development',
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || 'BOvwPIH8rp3tZVgGRoI4Vd7i9Dd9137im1NoKVDGAmEIda91_AsQGJiZtbbjcOKApoaQCWUSolT445eRPPPJj1I',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || 'PCP4OI3D9Ca-lKMFjEc-MK1vOVQmDTUFYmZ41lxPHLs',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:support@engplanner.local',
};
if (!exports.config.databaseUrl) {
    console.warn('DATABASE_URL environment variable is missing.');
}
