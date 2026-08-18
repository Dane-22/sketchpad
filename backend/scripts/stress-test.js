import ws from 'k6/ws';
import { check } from 'k6';
import { sleep } from 'k6';

// k6 options
export const options = {
  stages: [
    { duration: '30s', target: 500 }, // Ramp up to 500 users over 30s
    { duration: '1m', target: 500 },  // Stay at 500 users for 1m
    { duration: '10s', target: 0 },   // Ramp down to 0
  ],
};

export default function () {
  const url = 'ws://localhost:3001/socket.io/?EIO=4&transport=websocket';
  
  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', function () {
      // Socket.io engine.io handshake requires we wait for '0' (open) and reply with '40' (connect)
      // Actually with EIO=4, k6/ws receives the open packet (type 0)
    });

    socket.on('message', function (msg) {
      if (msg.startsWith('0')) {
        // Engine.io open, send connect
        socket.send('40');
      } else if (msg.startsWith('2')) {
        // Ping, respond with pong
        socket.send('3');
      } else if (msg.startsWith('40')) {
        // Connected to socket.io namespace
        // Start sending drawing events every second
        socket.setInterval(function () {
          const drawEvent = {
            id: `k6-el-${__VU}-${Date.now()}`,
            type: 'line',
            points: [Math.random() * 1000, Math.random() * 1000, Math.random() * 1000, Math.random() * 1000],
          };
          
          // emit 'element-added' event
          const packet = `42["element-added",${JSON.stringify(drawEvent)}]`;
          socket.send(packet);
        }, 1000); // 1 update per second per user
      }
    });

    socket.on('error', function (e) {
      if (e.error() != 'websocket: close sent') {
        console.log('An unexpected error occurred: ', e.error());
      }
    });

    // Close the connection after 1 minute
    socket.setTimeout(function () {
      socket.close();
    }, 60000);
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
