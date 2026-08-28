const http = require('http');

http.get('http://127.0.0.1:8001/settings/sku-mappings', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('GET /settings/sku-mappings status:', res.statusCode);
    try {
      const data = JSON.parse(body);
      console.log('Result count:', data.length);
      if (data.length > 0) {
        console.log('Sample item:', data[0]);
      }
    } catch(e) {
      console.log('Body:', body);
    }
  });
}).on('error', err => {
  console.log('Error:', err.message);
});
