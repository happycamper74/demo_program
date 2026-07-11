#!/usr/bin/env tsx
import http from 'node:http';

interface ReadinessCheck {
  readonly name: string;
  readonly status: 'pass' | 'warn' | 'fail';
  readonly message: string;
}

const checks: ReadinessCheck[] = [];

function record(name: string, status: ReadinessCheck['status'], message: string): void {
  checks.push({ name, status, message });
}

function checkEnv(name: string, required = false): void {
  const value = process.env[name];
  if (!value) {
    record(
      `env:${name}`,
      required ? 'fail' : 'warn',
      required ? `Missing required environment variable ${name}` : `Using local default for ${name}`,
    );
    return;
  }

  record(`env:${name}`, 'pass', `${name} is configured`);
}

async function checkHealth(url: string, name: string): Promise<void> {
  try {
    const body = await fetchJson(url);
    if (body && typeof body === 'object' && 'status' in body && (body as { status: string }).status === 'ok') {
      record(`health:${name}`, 'pass', `${name} health endpoint responded OK`);
      return;
    }

    record(`health:${name}`, 'warn', `${name} responded but did not report status=ok`);
  } catch {
    record(
      `health:${name}`,
      'warn',
      `${name} health endpoint is not reachable at ${url} (acceptable for offline checks)`,
    );
  }
}

function fetchJson(url: string): Promise<unknown> {
  if (typeof globalThis.fetch === 'function') {
    return fetch(url).then((response) => response.json());
  }

  return new Promise((resolve, reject) => {
    http
      .get(url, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}

async function main(): Promise<void> {
  const leadboardMode = process.env.LEADBOARD_ADAPTER_MODE ?? 'mock';
  if (leadboardMode === 'real') {
    const hasBaseUrl = Boolean(process.env.LEADBOARD_BASE_URL?.trim());
    const hasApiKey = Boolean(process.env.LEADBOARD_INTERNAL_API_KEY?.trim());
    if (hasBaseUrl && hasApiKey) {
      record('leadboard-adapter', 'pass', 'RealLeadBoardClient mode is configured');
    } else {
      record(
        'leadboard-adapter',
        'fail',
        'Real mode requires LEADBOARD_BASE_URL and LEADBOARD_INTERNAL_API_KEY',
      );
    }
  } else {
    record('leadboard-adapter', 'pass', 'MockLeadBoardClient mode is active');
  }

  checkEnv('EXPERIENCE_TOKEN_SIGNING_SECRET');
  checkEnv('OPS_INTERNAL_TOKEN');
  checkEnv('ANALYTICS_DATABASE_PATH', false);
  checkEnv('RATE_LIMIT_IP_MAX', false);

  if ((process.env.OPS_INTERNAL_TOKEN ?? 'local-ops-dev-token') === 'local-ops-dev-token') {
    record('ops-token', 'warn', 'OPS_INTERNAL_TOKEN uses the local development default');
  } else {
    record('ops-token', 'pass', 'OPS_INTERNAL_TOKEN is configured');
  }

  await checkHealth('http://localhost:3000/health', 'demo-api-bff');
  await checkHealth('http://localhost:3003/health', 'analytics');

  const failures = checks.filter((check) => check.status === 'fail');
  const warnings = checks.filter((check) => check.status === 'warn');

  console.log('Mock MVP Production Readiness Check');
  console.log('===================================');
  for (const check of checks) {
    console.log(`[${check.status.toUpperCase()}] ${check.name}: ${check.message}`);
  }

  console.log('\nMock MVP launch limitations:');
  console.log('- Real LeadBoard mode requires twilio_transcribe_new internal endpoints and server-side API key.');
  console.log('- Real mode does not simulate inbound calls; use actual Twilio intake or mock mode for local simulation.');
  console.log('- In-memory rate limiting and adaptive risk are process-local, not distributed.');
  console.log('- Challenge step is a placeholder; Cloudflare Turnstile is not integrated.');
  console.log('- Analytics and demo persistence use local SQLite stores.');
  console.log('- Operations auth uses a simple internal token guard, not full RBAC.');
  console.log('- No production monitoring, alerting, or SMS/email providers are wired yet.');

  console.log(`\nSummary: ${checks.length - failures.length - warnings.length} pass, ${warnings.length} warn, ${failures.length} fail`);

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

void main();
