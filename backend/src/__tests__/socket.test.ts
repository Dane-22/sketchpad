import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket } from 'socket.io-client';

describe('WebSocket Collaboration Tests', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocket1: Socket;
  let clientSocket2: Socket;
  let port: number;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      port = (httpServer.address() as any).port;
      
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
      
      clientSocket1 = Client(`http://localhost:${port}`);
      clientSocket2 = Client(`http://localhost:${port}`);
      
      let connections = 0;
      const onConnect = () => {
        connections++;
        if (connections === 2) done();
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

    clientSocket2.on('element-added', (data: any) => {
      expect(data).toEqual(testData);
      clientSocket2.off('element-added'); // cleanup
      done();
    });

    clientSocket1.emit('element-added', testData);
  });

  it('should broadcast element-updated to other clients', (done) => {
    const testData = { id: 'el-1', updates: { x: 10 } };

    clientSocket2.on('element-updated', (data: any) => {
      expect(data).toEqual(testData);
      clientSocket2.off('element-updated'); // cleanup
      done();
    });

    clientSocket1.emit('element-updated', testData);
  });

  it('should broadcast cursor-moved with socketId appended', (done) => {
    const testData = { x: 50, y: 100 };

    clientSocket2.on('cursor-moved', (data: any) => {
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
