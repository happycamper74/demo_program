export interface HealthResponse {
  readonly status: 'ok';
  readonly service: string;
}

export function createHealthResponse(serviceName: string): HealthResponse {
  return { status: 'ok', service: serviceName };
}

export function isHealthCheck(method: string | undefined, url: string | undefined): boolean {
  return method === 'GET' && url === '/health';
}
