import http from 'node:http';
import { DEFAULT_PORT, handleRequest, SERVICE_NAME } from './http.js';

const port = Number(process.env.PORT ?? DEFAULT_PORT);

const server = http.createServer(handleRequest);

server.listen(port, () => {
  console.log(`${SERVICE_NAME} listening on port ${port}`);
});
