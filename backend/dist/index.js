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
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const env_1 = require("./config/env");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const convertRoutes_1 = __importDefault(require("./routes/convertRoutes"));
const commentRoutes_1 = __importDefault(require("./routes/commentRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const errorHandler_1 = require("./middlewares/errorHandler");
exports.app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(exports.app);
// Initialize Socket.io
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*', // Adjust this for production
        methods: ['GET', 'POST']
    }
});
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    const globalRoom = 'global-canvas';
    socket.join(globalRoom);
    // Allow client to join a specific project room
    socket.on('join-project', (projectId) => {
        const room = `project-${projectId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined ${room}`);
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
    // Handle entire elements array sync (for initial sync or bulk changes)
    socket.on('elements-changed', (data) => {
        socket.to(globalRoom).emit('elements-changed', data);
    });
    // Handle individual element changes
    socket.on('element-added', (data) => {
        socket.to(globalRoom).emit('element-added', data);
    });
    socket.on('element-updated', (data) => {
        socket.to(globalRoom).emit('element-updated', data);
    });
    socket.on('element-removed', (data) => {
        socket.to(globalRoom).emit('element-removed', data);
    });
    socket.on('cursor-moved', (data) => {
        socket.to(globalRoom).emit('cursor-moved', { ...data, socketId: socket.id });
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
exports.app.use(express_1.default.json({ limit: '5gb' }));
exports.app.use(express_1.default.urlencoded({ limit: '5gb', extended: true }));
exports.app.use((0, cookie_parser_1.default)());
// Routes
exports.app.use('/api/v1/auth', authRoutes_1.default);
exports.app.use('/api/v1/projects', projectRoutes_1.default);
exports.app.use('/api/v1', convertRoutes_1.default);
exports.app.use('/api/v1', commentRoutes_1.default);
exports.app.use('/api/v1', chatRoutes_1.default);
exports.app.use('/api/v1/ai', aiRoutes_1.default);
// Global Error Handler
exports.app.use(errorHandler_1.errorHandler);
const PORT = env_1.config.port;
if (require.main === module) {
    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT} in ${env_1.config.nodeEnv} mode.`);
    });
}
