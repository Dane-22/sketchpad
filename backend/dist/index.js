"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const env_1 = require("./config/env");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const convertRoutes_1 = __importDefault(require("./routes/convertRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const commentRoutes_1 = __importDefault(require("./routes/commentRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const vapid_1 = require("./config/vapid");
const notificationService_1 = require("./services/notificationService");
exports.app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(exports.app);
// Initialize Web Push VAPID
(0, vapid_1.initVapid)();
// Initialize Socket.io with high-performance configuration
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*', // Adjust this for production
        methods: ['GET', 'POST']
    },
    maxHttpBufferSize: 1e7, // 10MB buffer safety
    pingTimeout: 30000,
    pingInterval: 10000,
});
// Pass socket server instance to notification service
(0, notificationService_1.setSocketServer)(io);
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    const globalRoom = 'global-canvas';
    socket.join(globalRoom);
    // Allow client to join personal user notification room
    socket.on('identify-user', (userId) => {
        if (userId) {
            const userRoom = `user-${userId}`;
            socket.join(userRoom);
            console.log(`Socket ${socket.id} joined user room: ${userRoom}`);
        }
    });
    // Allow client to join a specific project room
    socket.on('join-project', (projectId) => {
        if (projectId) {
            const room = `project-${projectId}`;
            socket.join(room);
            console.log(`Socket ${socket.id} joined ${room}`);
            socket.to(room).emit('user-joined', socket.id);
        }
    });
    socket.on('leave-project', (projectId) => {
        if (projectId) {
            const room = `project-${projectId}`;
            socket.leave(room);
            console.log(`Socket ${socket.id} left ${room}`);
        }
    });
    // Channel rooms for messenger
    socket.on('join-channel', (channelId) => {
        socket.join(`channel-${channelId}`);
    });
    socket.on('leave-channel', (channelId) => {
        socket.leave(`channel-${channelId}`);
    });
    socket.on('send-channel-message', (data) => {
        if (data.channelId) {
            socket.to(`channel-${data.channelId}`).emit('channel-message-received', data);
        }
        if (data.projectId) {
            socket.to(`project-${data.projectId}`).emit('channel-message-received', data);
        }
    });
    socket.on('channel-created', (data) => {
        if (data.projectId) {
            socket.to(`project-${data.projectId}`).emit('channel-created', data.channel);
        }
    });
    socket.on('channel-member-updated', (data) => {
        if (data.projectId) {
            socket.to(`project-${data.projectId}`).emit('channel-member-updated', data);
        }
    });
    // Handle entire elements array sync (scoped by project when available)
    socket.on('elements-changed', (data) => {
        const elements = Array.isArray(data) ? data : data?.elements;
        const projectId = !Array.isArray(data) ? data?.projectId : null;
        if (projectId) {
            socket.to(`project-${projectId}`).emit('elements-changed', elements);
        }
        else {
            socket.to(globalRoom).emit('elements-changed', elements);
        }
    });
    // Handle individual element added delta
    socket.on('element-added', (data) => {
        const element = data?.element || data;
        const projectId = data?.projectId;
        if (projectId) {
            socket.to(`project-${projectId}`).emit('element-added', element);
        }
        else {
            socket.to(globalRoom).emit('element-added', element);
        }
    });
    // Handle individual element updated delta
    socket.on('element-updated', (data) => {
        const projectId = data?.projectId;
        if (projectId) {
            socket.to(`project-${projectId}`).emit('element-updated', data);
        }
        else {
            socket.to(globalRoom).emit('element-updated', data);
        }
    });
    // Handle individual element removed delta
    socket.on('element-removed', (data) => {
        const id = typeof data === 'string' ? data : data?.id;
        const projectId = typeof data === 'object' ? data?.projectId : null;
        if (projectId) {
            socket.to(`project-${projectId}`).emit('element-removed', id);
        }
        else {
            socket.to(globalRoom).emit('element-removed', id);
        }
    });
    // Handle cursor movements (scoped by project)
    socket.on('cursor-moved', (data) => {
        const payload = { ...data, socketId: socket.id };
        if (data?.projectId) {
            socket.to(`project-${data.projectId}`).emit('cursor-moved', payload);
        }
        else {
            socket.to(globalRoom).emit('cursor-moved', payload);
        }
    });
    // Real-time Comments and Discussion events
    socket.on('new-comment', (data) => {
        if (data.projectId) {
            socket.to(`project-${data.projectId}`).emit('new-comment', data.comment);
        }
        socket.to(globalRoom).emit('new-comment', data.comment);
    });
    socket.on('comment-reply-added', (data) => {
        if (data.projectId) {
            socket.to(`project-${data.projectId}`).emit('comment-reply-added', data);
        }
        socket.to(globalRoom).emit('comment-reply-added', data);
    });
    socket.on('comment-resolved-updated', (data) => {
        if (data.projectId) {
            socket.to(`project-${data.projectId}`).emit('comment-resolved-updated', data);
        }
        socket.to(globalRoom).emit('comment-resolved-updated', data);
    });
    socket.on('comment-deleted', (data) => {
        if (data.projectId) {
            socket.to(`project-${data.projectId}`).emit('comment-deleted', data.commentId);
        }
        socket.to(globalRoom).emit('comment-deleted', data.commentId);
    });
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        socket.to(globalRoom).emit('user-disconnected', socket.id);
    });
});
// Security and utility middlewares
exports.app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json({ limit: '50mb' }));
exports.app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
exports.app.use((0, cookie_parser_1.default)());
// Static File Serving for Uploads (e.g. /uploads/canvas/img_123.webp)
const uploadsDirectory = path_1.default.join(__dirname, '..', 'uploads');
exports.app.use('/uploads', express_1.default.static(uploadsDirectory, {
    maxAge: '7d',
    immutable: true,
}));
// Routes
exports.app.use('/api/v1/auth', authRoutes_1.default);
exports.app.use('/api/v1/admin', adminRoutes_1.default);
exports.app.use('/api/v1/notifications', notificationRoutes_1.default);
exports.app.use('/api/v1/ai', aiRoutes_1.default);
exports.app.use('/api/v1/projects', projectRoutes_1.default);
exports.app.use('/api/v1/uploads', uploadRoutes_1.default);
exports.app.use('/api/v1', convertRoutes_1.default);
exports.app.use('/api/v1', commentRoutes_1.default);
exports.app.use('/api/v1', chatRoutes_1.default);
// Global Error Handler
exports.app.use(errorHandler_1.errorHandler);
const PORT = env_1.config.port;
if (require.main === module) {
    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT} in ${env_1.config.nodeEnv} mode.`);
    });
}
