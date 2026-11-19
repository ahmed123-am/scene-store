import { createServer } from 'node:http';
import { handleRequest } from './routes.js';

const port = Number(process.env.PORT ?? 3001);

const server = createServer(handleRequest);

server.listen(port, '127.0.0.1', () => {
  console.log('SCÈNE API running at http://127.0.0.1:' + port);
});