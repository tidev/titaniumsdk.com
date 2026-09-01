import net from 'node:net';
import tls from 'node:tls';

/**
 * Fails the process on any outbound network connection.
 *
 * TI-25 requires the build to read the registry from disk and nothing else,
 * because that is what makes rebuilds fast and preview deploys reproducible.
 * An assertion in a ticket does not stay true, so this enforces it:
 *
 *   NODE_OPTIONS="--import ./scripts/assert-offline.ts" pnpm build
 *
 * Patching the socket layer rather than `fetch` catches every client —
 * undici, node:http, and any dependency reaching out on its own.
 */

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '']);

/** Loopback and unix sockets are fine; a build may talk to its own workers. */
function allowed(host: unknown, path: unknown): boolean {
  if (typeof path === 'string' && path) return true;
  if (typeof host !== 'string') return true;
  return LOOPBACK.has(host) || host.endsWith('.localhost');
}

function refuse(host: unknown): never {
  const error = new Error(
    `Network access during build: connection to ${String(host)}. ` +
      'The build must read the registry from disk (TI-25).'
  );
  // Next runs page generation in workers that swallow rejections, so the
  // message goes to stderr directly as well as being thrown.
  console.error(`\n✗ ${error.message}\n`);
  throw error;
}

const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (this: net.Socket, ...args: unknown[]) {
  const options = args[0];
  if (typeof options === 'object' && options !== null) {
    const { host, path } = options as { host?: unknown; path?: unknown };
    if (!allowed(host, path)) refuse(host);
  } else if (typeof args[1] === 'string' && !allowed(args[1], undefined)) {
    refuse(args[1]);
  }
  return connect.apply(this, args as Parameters<typeof connect>);
};

const tlsConnect = tls.connect;
tls.connect = function (...args: unknown[]) {
  const options = args[0];
  if (typeof options === 'object' && options !== null) {
    const { host, path } = options as { host?: unknown; path?: unknown };
    if (!allowed(host, path)) refuse(host);
  }
  return tlsConnect.apply(tls, args as Parameters<typeof tlsConnect>);
} as typeof tls.connect;
