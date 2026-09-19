import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform } from '../services/index.js';
import { extractMercadoLivreId } from '../services/mercadolivre.js';
import { createAliExpressSignature } from '../services/aliexpress.js';
import { createShopeeSignature } from '../services/shopee.js';

test('detecta plataformas por domínio permitido', () => {
  assert.equal(detectPlatform('https://www.shopee.com.br/produto/1'), 'shopee');
  assert.equal(detectPlatform('https://pt.aliexpress.com/item/100.html'), 'aliexpress');
  assert.equal(detectPlatform('https://www.mercadolivre.com.br/MLB-123456-produto'), 'mercadolivre');
  assert.throws(() => detectPlatform('https://example.com/produto'), /não suportada/);
});
test('extrai id Mercado Livre e calcula assinaturas determinísticas', () => {
  assert.equal(extractMercadoLivreId('https://produto.mercadolivre.com.br/MLB-123456-teste'), 'MLB123456');
  assert.equal(createShopeeSignature('{"x":1}', 'secret'), '83830743d86527ff1b7e251328e56b070f2c790ca81199bdf5c31ff65fc919eb');
  assert.equal(createAliExpressSignature({ b: '2', a: '1', sign_method: 'md5' }, 'secret'), 'EF16F26C937CF52AE6F85DF2FD08B24A');
});
