export const SECRET_PLACEHOLDER = '••••••••';

/** Configuração persistida pelo painel tem prioridade sobre o ambiente. */
export function getConfig(cache, key) {
  return cache?.getConfig(key) ?? process.env[key];
}

export function maskSecret(value) {
  return value ? SECRET_PLACEHOLDER : '';
}

/** Nunca grava o placeholder nem uma substituição vazia sobre um segredo existente. */
export function shouldSaveSecret(value) {
  return Boolean(value) && value !== SECRET_PLACEHOLDER;
}
