import { getShopeeProduct } from './shopee.js';
import { getAliExpressProduct } from './aliexpress.js';
import { getMercadoLivreProduct } from './mercadolivre.js';

export function detectPlatform(input) {
  let hostname;
  try { hostname = new URL(input).hostname.toLowerCase().replace(/^www\./, ''); } catch { throw new Error('Envie uma URL válida de produto.'); }
  if (/(^|\.)shopee\.com\.br$/.test(hostname)) return 'shopee';
  if (/(^|\.)(mercadolivre\.com\.br|mercadolibre\.com)$/.test(hostname)) return 'mercadolivre';
  if (/(^|\.)(aliexpress\.com|aliexpress\.com\.br)$/.test(hostname)) return 'aliexpress';
  throw new Error('Plataforma não suportada. Use Shopee, AliExpress ou Mercado Livre.');
}
export async function resolveProduct(url, { mlAffiliateParams, cache } = {}) {
  switch (detectPlatform(url)) { case 'shopee': return getShopeeProduct(url, cache); case 'aliexpress': return getAliExpressProduct(url, cache); default: return getMercadoLivreProduct(url, mlAffiliateParams, cache); }
}
