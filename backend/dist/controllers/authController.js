"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const authService_1 = require("../services/authService");
exports.authController = {
    async register(req, res) {
        try {
            const result = await authService_1.authService.register(req.body);
            res.status(201).json(result);
        }
        catch (error) {
            if (error.message === 'Email is already in use') {
                res.status(400).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to register user' });
            }
        }
    },
    async login(req, res) {
        try {
            const result = await authService_1.authService.login(req.body);
            res.status(200).json(result);
        }
        catch (error) {
            if (error.message === 'Invalid email or password') {
                res.status(401).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to login' });
            }
        }
    },
    async getMe(req, res) {
        try {
            const user = req.user;
            res.status(200).json({ user });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get user data' });
        }
    }
};
