// Minimal server test for Replit port detection
const http = require('http');

const port = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK\n');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Test server listening on port ${port}`);
  console.log(`Server address: ${JSON.stringify(server.address())}`);
});

// Keep alive
setInterval(() => {
  console.log('Server still running...');
}, 5000);
