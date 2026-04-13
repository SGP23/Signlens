/**
 * Production Logger Utility
 * ─────────────────────────
 * - In production: suppresses console.log/debug/info, keeps console.error/warn
 * - In development: all levels pass through normally
 * - Provides a central `logError()` for consistent error reporting across the app
 */

const IS_PROD = import.meta.env.PROD

/**
 * Contextual error log — all catch blocks should funnel here.
 * In prod this is the ONLY output channel besides console.error.
 * @param {string} context  - e.g. "socketClient", "apiClient.getModelStatus"
 * @param {Error|string} error
 * @param {object} [extra]  - optional structured data for debugging
 */
export function logError(context, error, extra) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${context}]`, message, extra ?? '')
}

/**
 * Development-only log — silenced in production builds.
 */
export function logDebug(...args) {
  if (!IS_PROD) {
    // eslint-disable-next-line no-console
    console.log(...args)
  }
}

/**
 * Development-only info log — silenced in production builds.
 */
export function logInfo(...args) {
  if (!IS_PROD) {
    // eslint-disable-next-line no-console
    console.info(...args)
  }
}

/**
 * Warning log — always emitted (visible in prod).
 */
export function logWarn(...args) {
  console.warn(...args)
}

/**
 * Install global overrides that suppress console.log in production.
 * Call once at app bootstrap (main.jsx).
 */
export function installProductionLogger() {
  if (IS_PROD) {
    const noop = () => {}
    // eslint-disable-next-line no-console
    console.log = noop
    // eslint-disable-next-line no-console
    console.debug = noop
    // eslint-disable-next-line no-console
    console.info = noop
    // console.warn and console.error are intentionally kept
  }
}
