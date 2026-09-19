import fetch from 'node-fetch';
import { withRetry } from './retry.js';

export async function requestJson(url, options = {}) {
  const timeout = Number(process.env.REQUEST_TIMEOUT_MS || 15000);
  return withRetry(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const text = await response.text();
      let body;
      try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
      if (!response.ok) {
        const error = new Error(body.message || body.error_description || `API respondeu HTTP ${response.status}`);
        error.status = response.status;
        error.body = body;
        error.retryAfterMs = Number(response.headers.get('retry-after')) * 1000;
        throw error;
      }
      return body;
    } finally { clearTimeout(timer); }
  });
}
