const DxfParser = require('dxf-parser');
console.log('DxfParser:', DxfParser);
try {
  const parser = new DxfParser();
  console.log('Success');
} catch (e) {
  console.log('Error:', e.message);
}
