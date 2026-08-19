"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webpush = exports.initVapid = void 0;
const web_push_1 = __importDefault(require("web-push"));
exports.webpush = web_push_1.default;
const env_1 = require("./env");
const initVapid = () => {
    if (env_1.config.vapidPublicKey && env_1.config.vapidPrivateKey) {
        try {
            web_push_1.default.setVapidDetails(env_1.config.vapidSubject, env_1.config.vapidPublicKey, env_1.config.vapidPrivateKey);
            console.log('✅ WebPush VAPID details initialized successfully');
        }
        catch (err) {
            console.error('❌ Failed to initialize WebPush VAPID details:', err);
        }
    }
    else {
        console.warn('⚠️ VAPID public/private keys are missing. Web push notifications will be disabled.');
    }
};
exports.initVapid = initVapid;
