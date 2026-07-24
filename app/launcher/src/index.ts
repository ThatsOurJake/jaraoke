import { type ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';
import { program } from 'commander';

program
  .option('--host <host>', 'bind host passed to the server', '127.0.0.1')
  .option('--port <port>', 'port the server listens on', '9897')
  .option('--log-level <level>', 'server log level', 'info')
  .option('--no-ui', 'start server only, skip opening the viewer')
  .option('--url <url>', 'override the URL opened in the viewer')
  .parse();

const opts = program.opts<{
  host: string;
  port: string;
  logLevel: string;
  ui: boolean;
  url?: string;
}>();

const serverEntry =
  process.env['SERVER_ENTRY'] ?? path.join(__dirname, 'app', 'index.js');
const viewerBin =
  process.env['VIEWER_BIN'] ??
  path.join(
    __dirname,
    'bin',
    process.platform === 'win32' ? 'viewer.exe' : 'viewer',
  );

const serverUrl = `http://${opts.host}:${opts.port}`;
const targetUrl = opts.url ?? `${serverUrl}/splash`;

let serverProc: ChildProcess | null = null;
let viewerProc: ChildProcess | null = null;
let shuttingDown = false;

const shutdown = (code = 0): void => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (viewerProc && !viewerProc.killed) {
    viewerProc.kill();
  }

  if (serverProc && !serverProc.killed) {
    serverProc.kill();
  }

  setTimeout(() => process.exit(code), 300);
};

serverProc = spawn(process.execPath, [serverEntry], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: opts.port,
    HOST: opts.host,
    LOG_LEVEL: opts.logLevel,
    NODE_ENV: process.env['NODE_ENV'] ?? 'production',
  },
});

serverProc.on('exit', (code) => {
  if (!shuttingDown) {
    process.stderr.write(
      `[launcher] Server exited unexpectedly (code ${code ?? 'null'})\n`,
    );
    shutdown(code ?? 1);
  }
});

const waitForReachable = async (): Promise<void> => {
  process.stdout.write('[launcher] Waiting for server to become reachable…\n');
  while (true) {
    try {
      const res = await fetch(`${serverUrl}/api/health`);
      if (res.ok) {
        process.stdout.write('[launcher] Server is reachable\n');
        return;
      }
    } catch {
      // not yet reachable
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  }
};

const launchViewer = (): void => {
  process.stdout.write(`[launcher] Opening viewer at ${targetUrl}\n`);

  viewerProc = spawn(viewerBin, [targetUrl], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  viewerProc.stdout?.on('data', (chunk: Buffer) => process.stdout.write(chunk));
  viewerProc.stderr?.on('data', (chunk: Buffer) => process.stderr.write(chunk));

  viewerProc.on('exit', () => {
    if (!shuttingDown) {
      process.stdout.write('[launcher] Viewer closed — shutting down\n');
      shutdown(0);
    }
  });

  viewerProc.on('error', (err) => {
    process.stderr.write(`[launcher] Failed to start viewer: ${err.message}\n`);
    shutdown(1);
  });
};

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));

(async () => {
  await waitForReachable();
  if (opts.ui) {
    launchViewer();
  }
})().catch((err: unknown) => {
  process.stderr.write(`[launcher] Fatal error: ${err}\n`);
  shutdown(1);
});
