import crypto from 'node:crypto';
import { requestJson } from '../utils/http.js';

const API_URL = (cache) => cache?.getConfig('ALIEXPRESS_API_URL') || process.env.ALIEXPRESS_API_URL || 'https://api-sg.aliexpress.com/sync';

/**
 * Alibaba Open Platform: a assinatura é MD5 em hexadecimal maiúsculo de
 * APP_SECRET + (chaves ordenadas concatenadas aos seus valores) + APP_SECRET.
 * O parâmetro sign não participa do cálculo. Consulte o método habilitado no portal.
 */
export function createAliExpressSignature(params, secret) {
  const data = Object.entries(params).filter(([key]) => key !== 'sign' && key !== 'sign_method')
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}${value}`).join('');
  return crypto.createHash('md5').update(`${secret}${data}${secret}`, 'utf8').digest('hex').toUpperCase();
}

function baseParams(method, cache) {
  const appKey = cache?.getConfig('ALIEXPRESS_APP_KEY') ?? process.env.ALIEXPRESS_APP_KEY;
  const secret = cache?.getConfig('ALIEXPRESS_APP_SECRET') ?? process.env.ALIEXPRESS_APP_SECRET;
  const trackingId = cache?.getConfig('ALIEXPRESS_TRACKING_ID') ?? process.env.ALIEXPRESS_TRACKING_ID;
  if (!appKey || !secret || !trackingId) throw new Error('Credenciais AliExpress ausentes (APP_KEY, APP_SECRET ou TRACKING_ID).');
  const params = { app_key: appKey, method, sign_method: 'md5', timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19), format: 'json', v: '2.0' };
  params.sign = createAliExpressSignature(params, secret);
  return params;
}

async function call(method, parameters, cache) {
  const params = { ...baseParams(method, cache), ...parameters };
  // O sign deve ser recalculado depois dos argumentos específicos do método.
  params.sign = createAliExpressSignature(params, cache?.getConfig('ALIEXPRESS_APP_SECRET') ?? process.env.ALIEXPRESS_APP_SECRET);
  return requestJson(`${API_URL(cache)}?${new URLSearchParams(params)}`);
}

function unwrap(body) {
  const root = body?.[Object.keys(body).find((key) => key.endsWith('_response'))];
  if (body?.error_response || root?.resp_result?.result?.error_code) throw new Error(body.error_response?.msg || root?.resp_result?.result?.error_message || 'A API AliExpress recusou a requisição.');
  return root?.resp_result?.result ?? root ?? body;
}

export async function getAliExpressProduct(url, cache) {
  const linkData = unwrap(await call('aliexpress.affiliate.link.generate', { promotion_link_type: '0', source_values: url, tracking_id: cache?.getConfig('ALIEXPRESS_TRACKING_ID') ?? process.env.ALIEXPRESS_TRACKING_ID }, cache));
  const link = linkData.promotion_links?.promotion_link?.[0]?.promotion_link || linkData.promotion_link || linkData.promotion_links?.[0];
  if (!link) throw new Error('A API AliExpress não retornou um link de afiliado.');
  const detailData = unwrap(await call('aliexpress.affiliate.product.detail.get', { product_urls: url, tracking_id: cache?.getConfig('ALIEXPRESS_TRACKING_ID') ?? process.env.ALIEXPRESS_TRACKING_ID }, cache));
  const product = detailData.products?.product?.[0] || detailData.products?.[0] || detailData;
  if (!product?.product_title) throw new Error('Produto não encontrado na API AliExpress.');
  return { platform: 'aliexpress', platformLabel: 'AliExpress', id: String(product.product_id || url), title: product.product_title,
    price: product.target_sale_price || product.sale_price || 'Preço indisponível', image: product.product_main_image_url, affiliateUrl: link };
}
