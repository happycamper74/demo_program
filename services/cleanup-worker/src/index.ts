export interface WorkerHealthStatus {
  readonly status: 'ok';
  readonly service: string;
}

export const SERVICE_NAME = 'cleanup-worker';

export function getHealthStatus(): WorkerHealthStatus {
  return { status: 'ok', service: SERVICE_NAME };
}

console.log(`${SERVICE_NAME} worker placeholder ready`);
