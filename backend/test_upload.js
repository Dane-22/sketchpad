const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  const form = new FormData();
  form.append('file', fs.createReadStream('./package.json'));

  try {
    const res = await fetch('http://localhost:5005/api/v1/convert', {
      method: 'POST',
      body: form
    });
    console.log(res.status, await res.text());
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
testUpload();
