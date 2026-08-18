"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socket_io_client_1 = require("socket.io-client");
describe('WebSocket Collaboration Tests', () => {
    let io;
    let serverSocket;
    let clientSocket1;
    let clientSocket2;
    let port;
    beforeAll((done) => {
        const httpServer = (0, http_1.createServer)();
        io = new socket_io_1.Server(httpServer);
        httpServer.listen(() => {
            port = httpServer.address().port;
            // Setup the same event handlers as our app
            io.on('connection', (socket) => {
                const globalRoom = 'global-canvas';
                socket.join(globalRoom);
                socket.on('element-updated', (data) => {
                    socket.to(globalRoom).emit('element-updated', data);
                });
                socket.on('element-added', (data) => {
                    socket.to(globalRoom).emit('element-added', data);
                });
                socket.on('cursor-moved', (data) => {
                    socket.to(globalRoom).emit('cursor-moved', { ...data, socketId: socket.id });
                });
            });
            clientSocket1 = (0, socket_io_client_1.io)(`http://localhost:${port}`);
            clientSocket2 = (0, socket_io_client_1.io)(`http://localhost:${port}`);
            let connections = 0;
            const onConnect = () => {
                connections++;
                if (connections === 2)
                    done();
            };
            clientSocket1.on('connect', onConnect);
            clientSocket2.on('connect', onConnect);
        });
    });
    afterAll(() => {
        io.close();
        clientSocket1.close();
        clientSocket2.close();
    });
    it('should broadcast element-added to other clients', (done) => {
        const testData = { id: 'el-1', type: 'line' };
        clientSocket2.on('element-added', (data) => {
            expect(data).toEqual(testData);
            clientSocket2.off('element-added'); // cleanup
            done();
        });
        clientSocket1.emit('element-added', testData);
    });
    it('should broadcast element-updated to other clients', (done) => {
        const testData = { id: 'el-1', updates: { x: 10 } };
        clientSocket2.on('element-updated', (data) => {
            expect(data).toEqual(testData);
            clientSocket2.off('element-updated'); // cleanup
            done();
        });
        clientSocket1.emit('element-updated', testData);
    });
    it('should broadcast cursor-moved with socketId appended', (done) => {
        const testData = { x: 50, y: 100 };
        clientSocket2.on('cursor-moved', (data) => {
            expect(data.x).toBe(testData.x);
            expect(data.y).toBe(testData.y);
            expect(data.socketId).toBeDefined();
            expect(data.socketId).toBe(clientSocket1.id);
            clientSocket2.off('cursor-moved');
            done();
        });
        clientSocket1.emit('cursor-moved', testData);
    });
});
