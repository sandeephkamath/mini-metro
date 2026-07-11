import { logGameEvent } from './analytics';

// Web's crash-reporting path (themes/metro.md §12.3) — there's no Crashlytics web
// product, so unhandled JS errors/rejections are routed through the same
// fire-and-forget Analytics pipeline as everything else instead. Capped per session
// so a repeating/looping error can't flood Analytics.
const MAX_JS_ERROR_EVENTS_PER_SESSION = 10;
let jsErrorCount = 0;

function reportJsError(message: string, source: string): void {
  if (jsErrorCount >= MAX_JS_ERROR_EVENTS_PER_SESSION) return;
  jsErrorCount++;
  logGameEvent('js_error', { message: message.slice(0, 150), source });
}

export function initCrashReporting(): void {
  window.addEventListener('error', event => {
    reportJsError(event.message, event.filename ? `${event.filename}:${event.lineno}` : 'unknown');
  });
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    reportJsError(message, 'unhandledrejection');
  });
}
