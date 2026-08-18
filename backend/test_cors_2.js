const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 5005,
  path: '/api/v1/convert',
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type'
  }
}, (res) => {
  console.log('OPTIONS status:', res.statusCode);
  console.log('OPTIONS headers:', res.headers);
});

req.on('error', (e) => console.error('OPTIONS error:', e));
req.end();
