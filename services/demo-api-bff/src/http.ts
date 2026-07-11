import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHealthResponse, isHealthCheck } from './api/health.js';
import { handleDemoApiRequest } from './api/demo/routes.js';
import { handleOpsApiRequest } from './api/ops/routes.js';
import { createDemoApiDependencies, type DemoApiDependencies } from './infrastructure/dependencies.js';

export const SERVICE_NAME = 'demo-api-bff';
export const DEFAULT_PORT = 3000;

let cachedDependencies: DemoApiDependencies | undefined;

function getDependencies(): DemoApiDependencies {
  cachedDependencies ??= createDemoApiDependencies();
  return cachedDependencies;
}

export function createHandleRequest(dependencies?: DemoApiDependencies) {
  return async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (isHealthCheck(req.method, req.url ?? undefined)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(createHealthResponse(SERVICE_NAME)));
      return;
    }

    const deps = dependencies ?? getDependencies();

    const opsHandled = await handleOpsApiRequest(req, res, {
      opsService: deps.opsService,
      analyticsService: deps.analyticsService,
    });
    if (opsHandled) {
      return;
    }

    const handled = await handleDemoApiRequest(req, res, deps);
    if (!handled) {
      res.writeHead(404).end();
    }
  };
}

export const handleRequest = createHandleRequest();
