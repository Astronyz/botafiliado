import { requestJson } from '../utils/http.js';

const ITEM_ID = /\b(ML[BACUM])[- ]?(\d+)\b/i;

export function extractMercadoLivreId(url) {
  const match = decodeURIComponent(url).match(ITEM_ID);
  if (!match) throw new Error('Não foi possível localizar o ID do item do Mercado Livre na URL.');
  return `${match[1].toUpperCase()}${match[2]}`;
}

function addAffiliateParams(url, params) {
  if (!params) return url;
  const target = new URL(url);
  const configured = new URLSearchParams(params.replace(/^\?/, ''));
  for (const [key, value] of configured) target.searchParams.set(key, value);
  return target.toString();
}

export async function getMercadoLivreProduct(url, affiliateParams = process.env.ML_AFFILIATE_PARAMS, cache) {
  const id = extractMercadoLivreId(url);
  const item = await requestJson(`https://api.mercadolibre.com/items/${id}`, {
    headers: (cache?.getConfig('ML_ACCESS_TOKEN') ?? process.env.ML_ACCESS_TOKEN) ? { Authorization: `Bearer ${cache?.getConfig('ML_ACCESS_TOKEN') ?? process.env.ML_ACCESS_TOKEN}` } : {}
  });
  if (!item?.id) throw new Error('Produto não encontrado no Mercado Livre.');
  return {
    platform: 'mercadolivre', platformLabel: 'Mercado Livre', id: item.id,
    title: item.title, price: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: item.currency_id || 'BRL' }).format(item.price),
    image: item.thumbnail?.replace('http://', 'https://'),
    // O Mercado Livre não oferece API pública para criar links de afiliado; apenas anexamos parâmetros cadastrados.
    affiliateUrl: addAffiliateParams(item.permalink || url, affiliateParams)
  };
}
