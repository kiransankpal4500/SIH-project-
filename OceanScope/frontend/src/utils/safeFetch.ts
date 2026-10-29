/**
 * Safe Fetch and JSON Parser Utility
 * Prevents "Unexpected token '<', <!doctype..." syntax errors when static hosts return HTML fallback pages.
 * Handles timeouts safely without masking caller signals.
 */

export async function safeFetchJson<T>(url: string, options?: RequestInit, timeoutMs = 18000): Promise<T> {
  const callerSignal = options?.signal;

  // If caller already aborted, reject immediately
  if (callerSignal?.aborted) {
    const abortErr = new Error('Request was aborted by caller');
    abortErr.name = 'AbortError';
    throw abortErr;
  }

  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(new Error(`Request to '${url}' timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  // Combine caller signal and timeout controller
  const combinedController = new AbortController();

  const onCallerAbort = () => {
    combinedController.abort(callerSignal?.reason || new Error('Request was cancelled'));
  };

  const onTimeoutAbort = () => {
    combinedController.abort(timeoutController.signal.reason);
  };

  if (callerSignal) {
    callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }
  timeoutController.signal.addEventListener('abort', onTimeoutAbort, { once: true });

  try {
    const fetchOptions: RequestInit = {
      ...options,
      signal: combinedController.signal,
    };
    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error(`Endpoint '${url}' returned HTML instead of JSON. Backend service may not be running at this URL.`);
    }

    const text = await res.text();
    const trimmed = text.trim();
    if (trimmed.startsWith('<') || trimmed.startsWith('<!doctype')) {
      throw new Error(`Endpoint '${url}' returned an HTML page instead of valid JSON.`);
    }

    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
    if (callerSignal) {
      callerSignal.removeEventListener('abort', onCallerAbort);
    }
    timeoutController.signal.removeEventListener('abort', onTimeoutAbort);
  }
}
