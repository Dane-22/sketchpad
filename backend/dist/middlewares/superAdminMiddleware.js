"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminMiddleware = void 0;
const superAdminMiddleware = (req, res, next) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Super Admin or Admin privileges required' });
    }
    next();
};
exports.superAdminMiddleware = superAdminMiddleware;
