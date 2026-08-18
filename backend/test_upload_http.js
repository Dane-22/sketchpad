const fs = require('fs');
const http = require('http');
const path = require('path');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const filePath = path.join(__dirname, 'package.json');
const fileStats = fs.statSync(filePath);
const fileName = 'package.json';

const postData = `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
  `Content-Type: application/json\r\n\r\n` +
  `${fs.readFileSync(filePath, 'utf8')}\r\n` +
  `--${boundary}--\r\n`;

const req = http.request({
  hostname: 'localhost',
  port: 5005,
  path: '/api/v1/convert',
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
});

req.on('error', (e) => console.error(e));
req.write(postData);
req.end();
