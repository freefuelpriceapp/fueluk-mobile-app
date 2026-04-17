/**
 * logger.js
 *
 * Launch-safe structured error & crash logger for the fueluk mobile app.
 *
 * Guardrails:
 *  - No network I/O in launch build. Remote sink is disabled scaffolding.
 *  - No PII. Never log user coords, postcodes, emails, tokens, or device IDs.
 *  - Must never throw. Logging failures are swallowed silently.
 *  - Wire a real sink (Sentry / Bugsnag / custom HTTP) AFTER launch sign-off
 *    by flipping REMOTE_ENABLED and implementing sendRemote().
 *
 * Responsibilities:
 *  - Structured error capture with level + context + scrubbed payload.
 *  - Global crash hooks for uncaught JS errors and unhandled promise rejections.
 *  - API interaction context helper (method, url, status, durationMs, code).
 */

const REMOTE_ENABLED = false;

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 };

// Keys that must never leave the device.
const PII_KEYS = [
  'lat', 'lng', 'latitude', 'longitude', 'coords',
  'postcode', 'postalCode', 'address',
  'email', 'phone', 'token', 'authorization', 'password',
  'deviceId', 'userId',
];

const scrub = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    if (PII_KEYS.includes(k)) {
      out[k] = '[redacted]';
    } else if (obj[k] && typeof obj[k] === 'object') {
      out[k] = scrub(obj[k]);
    } else {
      out[k] = obj[k];
    }
  }
  return out;
};

const nowIso = () => new Date().toISOString();

const sendRemote = (_record) => {
  // Disabled scaffolding. Implement provider adapter post-launch.
  // e.g. Sentry.captureEvent(_record);
};

const emit = (level, message, context = {}, err) => {
  try {
    const record = {
      ts: nowIso(),
      level,
      message: String(message || ''),
      context: scrub(context),
      error: err ? {
        name: err.name,
        message: err.message,
        stack: typeof err.stack === 'string' ? err.stack.split('\n').slice(0, 20).join('\n') : undefined,
      } : undefined,
    };
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      const fn = console[level] || console.log;
      fn('[fueluk]', record);
    }
    if (REMOTE_ENABLED) sendRemote(record);
  } catch (_) {
    // Never throw from the logger.
  }
};

export const logger = {
  debug: (msg, ctx) => emit('debug', msg, ctx),
  info:  (msg, ctx) => emit('info',  msg, ctx),
  warn:  (msg, ctx) => emit('warn',  msg, ctx),
  error: (msg, ctx, err) => emit('error', msg, ctx, err),
  fatal: (msg, ctx, err) => emit('fatal', msg, ctx, err),
};

/**
 * Build a compact context object for a failed API interaction.
 * Intentionally omits request/response bodies to avoid leaking PII.
 */
export const apiErrorContext = ({ method, url, status, code, durationMs, requestId }) => ({
  kind: 'api',
  method: method || 'GET',
  url: url || '',
  status: typeof status === 'number' ? status : undefined,
  code: code || undefined,
  durationMs: typeof durationMs === 'number' ? Math.round(durationMs) : undefined,
  requestId: requestId || undefined,
});

/**
 * Install global crash hooks once at app start (call from App.js).
 *  - Uncaught JS errors -> logger.fatal
 *  - Unhandled promise rejections -> logger.error
 */
let _installed = false;
export const installCrashHandlers = () => {
  if (_installed) return;
  _installed = true;
  try {
    // React Native global error handler
    const g = typeof global !== 'undefined' ? global : {};
    if (g.ErrorUtils && typeof g.ErrorUtils.setGlobalHandler === 'function') {
      const prev = g.ErrorUtils.getGlobalHandler && g.ErrorUtils.getGlobalHandler();
      g.ErrorUtils.setGlobalHandler((err, isFatal) => {
        logger.fatal('uncaught_js_error', { isFatal: !!isFatal }, err);
        if (typeof prev === 'function') {
          try {
            prev(err, isFatal);
          } catch (_e) {
            // Ignore errors from previous handler chain.
          }
        }
      });
    }
    // Unhandled promise rejections (Hermes / RN)
    if (typeof process !== 'undefined' && process && typeof process.on === 'function') {
      process.on('unhandledRejection', (reason) => {
        const err = reason instanceof Error ? reason : new Error(String(reason));
        logger.error('unhandled_promise_rejection', {}, err);
      });
    }
  } catch (_) {
    // Swallow. Never block app start because of logging setup.
  }
};

export default {
  logger,
  apiErrorContext,
  installCrashHandlers,
};
