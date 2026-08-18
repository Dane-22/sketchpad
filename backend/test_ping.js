const http = require('http');

http.get('http://localhost:5005/api/v1/projects', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
}).on('error', (err) => {
  console.log('Error:', err.message);
});
