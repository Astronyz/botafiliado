import crypto from 'node:crypto';
import { requestJson } from '../utils/http.js';

/**
 * A Affiliate Open API da Shopee usa GraphQL e assinatura SHA-256 do payload.
 * A assinatura abaixo é HMAC-SHA256 do JSON exatamente enviado, usando App Secret;
 * App ID e assinatura seguem em headers. Ajuste os nomes/URL se o painel regional
 * da Shopee informar variante diferente da sua aplicação.
 */
export function createShopeeSignature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

async function graphql(query, variables) {
  const { SHOPEE_APP_ID: appId, SHOPEE_APP_SECRET: secret } = process.env;
  if (!appId || !secret) throw new Error('Credenciais Shopee ausentes (SHOPEE_APP_ID/SHOPEE_APP_SECRET).');
  const payload = JSON.stringify({ query, variables });
  const body = await requestJson(process.env.SHOPEE_API_URL || 'https://open-api.affiliate.shopee.com.br/graphql', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-app-id': appId, 'x-signature': createShopeeSignature(payload, secret) }, body: payload
  });
  if (body.errors?.length) throw new Error(`Shopee: ${body.errors[0].message}`);
  return body.data;
}

export async function getShopeeProduct(url) {
  const query = `query Product($url: String!) { productOfferV2(productUrl: $url) { itemId productName price imageUrl } generateShortLink(originUrl: $url) { shortLink } }`;
  const data = await graphql(query, { url });
  const product = data?.productOfferV2;
  const affiliateUrl = data?.generateShortLink?.shortLink;
  if (!product?.itemId || !affiliateUrl) throw new Error('Produto ou link de afiliado não retornado pela Shopee.');
  return { platform: 'shopee', platformLabel: 'Shopee', id: String(product.itemId), title: product.productName,
    price: product.price || 'Preço indisponível', image: product.imageUrl, affiliateUrl };
}
