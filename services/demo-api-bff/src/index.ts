import http from 'node:http';
import { createInitializedDemoApiDependencies } from './infrastructure/dependencies.js';
import { DEFAULT_PORT, createHandleRequest, SERVICE_NAME } from './http.js';

const port = Number(process.env.PORT ?? DEFAULT_PORT);

const dependencies = await createInitializedDemoApiDependencies();
const handleRequest = createHandleRequest(dependencies);

const server = http.createServer((req, res) => {
  void handleRequest(req, res);
});

server.listen(port, () => {
  console.log(`${SERVICE_NAME} listening on port ${port}`);
});
