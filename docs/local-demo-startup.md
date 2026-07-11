# Local LeadBoard Interactive Demo Stack

One foreground command starts the complete local demo stack: LeadBoard server and worker, Cloudflare quick tunnel, demo API BFF, demo website, and operations center.

## Prerequisites

- macOS or Linux with `bash`, `curl`, `lsof`, and `cloudflared` installed
- [nvm](https://github.com/nvm-sh/nvm) with Node.js 22.23.1 available
- LeadBoard repository checked out at `~/Projects/twilio_transcribe_new` (or your configured path)
- LeadBoard `.env` with at least:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `TWILIO_AUTH_TOKEN`
- Retell credentials for live voice webhooks

## Setup

1. Copy the local demo environment template:

   ```bash
   cp .env.local-demo.example .env.local-demo
   ```

2. Edit `.env.local-demo` and fill in:

   - `RETELL_API_KEY`
   - `RETELL_AGENT_ID`
   - `RETELL_WEBHOOK_SECRET`

   Adjust `LEADBOARD_REPO` or `DEMO_REPO` if your checkout paths differ.

3. Confirm the LeadBoard repository `.env` contains `DATABASE_URL`, `REDIS_URL`, and `TWILIO_AUTH_TOKEN`.

4. Make the scripts executable:

   ```bash
   chmod +x scripts/start-local-demo.sh
   chmod +x scripts/check-local-demo.sh
   ```

## Start the stack

From the `demo_program` repository root:

```bash
./scripts/start-local-demo.sh
```

The launcher:

1. Validates prerequisites and free ports
2. Starts a Cloudflare quick tunnel and captures the public HTTPS URL
3. Starts LeadBoard server (port 3000) with `TWILIO_WEBHOOK_BASE_URL` set to that URL
4. Starts LeadBoard worker (port 8080)
5. Starts demo-api-bff (port 3002), demo-web (port 5173), and operations-center (port 5174)
6. Waits for health checks
7. Prints webhook URLs and local URLs

Before placing a call, paste the printed webhook URLs into:

- **Twilio** — demo number Voice webhook: `POST $PUBLIC_URL/webhooks/twilio/voice/twiml/inbound`
- **Retell** — agent webhook: `$PUBLIC_URL/webhooks/retell`

## Stop the stack

Press **Ctrl+C** in the launcher terminal. Only processes started by the launcher are stopped.

## Check health without starting

If the stack is already running:

```bash
./scripts/check-local-demo.sh
```

Or pass the active Cloudflare URL explicitly:

```bash
PUBLIC_URL=https://example.trycloudflare.com ./scripts/check-local-demo.sh
```

The launcher writes the active URL to `/tmp/leadboard-local-demo/public-url`.

## Logs

Runtime logs are written to `/tmp/leadboard-local-demo/`:

- `cloudflared.log`
- `leadboard-server.log`
- `leadboard-worker.log`
- `demo-api-bff.log`
- `demo-web.log`
- `operations-center.log`

## Ports

| Service            | Port |
|--------------------|------|
| LeadBoard server   | 3000 |
| demo-api-bff       | 3002 |
| demo-web           | 5173 |
| operations-center  | 5174 |
| LeadBoard worker   | 8080 |

If a port is already in use, the launcher exits before starting anything. Inspect the blocking process:

```bash
lsof -nP -iTCP:<PORT> -sTCP:LISTEN
```

## Security

- `.env.local-demo` is git-ignored. Never commit Retell, Twilio, or database secrets.
- The launcher does not print secret values.
