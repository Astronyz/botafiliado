/** Executa uma operação remota com espera crescente para erros transitórios/rate limit. */
export async function withRetry(operation, { retries = 3, baseDelayMs = 500 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const status = error.status ?? error.response?.status;
      const transient = !status || status === 429 || status >= 500;
      if (!transient || attempt === retries) break;
      const retryAfter = Number(error.retryAfterMs) || baseDelayMs * (2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
    }
  }
  throw lastError;
}
