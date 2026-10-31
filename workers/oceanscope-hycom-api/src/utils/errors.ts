/**
 * Standardized HTTP Errors and Response Formatters
 */

export class HYCOMUpstreamError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number = 502) {
    super(message);
    this.name = 'HYCOMUpstreamError';
    this.statusCode = statusCode;
  }
}

export class HYCOMTimeoutError extends Error {
  public readonly statusCode: number = 504;
  constructor(message: string = 'HYCOM upstream server timed out. Please retry.') {
    super(message);
    this.name = 'HYCOMTimeoutError';
  }
}

export function jsonResponse(data: unknown, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

export function errorResponse(err: unknown, corsHeaders: Record<string, string> = {}): Response {
  let status = 500;
  let detail = 'An unexpected error occurred while processing HYCOM oceanographic data.';

  if (err && typeof err === 'object') {
    const errorObj = err as { name?: string; message?: string; statusCode?: number };
    if (errorObj.statusCode) {
      status = errorObj.statusCode;
    } else if (errorObj.name === 'ValidationError') {
      status = 400;
    } else if (errorObj.name === 'HYCOMTimeoutError') {
      status = 504;
    } else if (errorObj.name === 'HYCOMUpstreamError') {
      status = 502;
    }

    if (errorObj.message) {
      detail = errorObj.message;
    }
  }

  return jsonResponse({ detail }, status, {
    ...corsHeaders,
    'Cache-Control': 'no-store',
  });
}
