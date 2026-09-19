import test from 'node:test';
import assert from 'node:assert/strict';
import { createCache } from '../utils/cache.js';
import { createWebApp } from '../web/server.js';
import { SECRET_PLACEHOLDER, maskSecret, shouldSaveSecret } from '../utils/config.js';

async function runningApp(cache) {
  const server = createWebApp(cache).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
test('painel exige Basic Auth', async () => {
  process.env.WEB_ADMIN_USER = 'admin'; process.env.WEB_ADMIN_PASSWORD = 'senha';
  const cache = createCache(':memory:'); const { server, url } = await runningApp(cache);
  const response = await fetch(url); assert.equal(response.status, 401); assert.match(response.headers.get('www-authenticate'), /Basic/);
  await new Promise((resolve) => server.close(resolve)); cache.close();
});
test('settings tem prioridade e .env é fallback', () => {
  process.env.SHOPEE_APP_ID = 'do-env'; const cache = createCache(':memory:');
  assert.equal(cache.getConfig('SHOPEE_APP_ID'), 'do-env'); cache.setSetting('SHOPEE_APP_ID', 'do-sqlite');
  assert.equal(cache.getConfig('SHOPEE_APP_ID'), 'do-sqlite'); cache.close();
});
test('segredo é mascarado e placeholder nunca substitui valor', () => {
  const cache = createCache(':memory:'); cache.setSetting('DISCORD_TOKEN', 'segredo-real');
  assert.equal(maskSecret(cache.getConfig('DISCORD_TOKEN')), SECRET_PLACEHOLDER);
  assert.equal(shouldSaveSecret(SECRET_PLACEHOLDER), false); assert.equal(shouldSaveSecret('novo-segredo'), true);
  assert.equal(cache.getConfig('DISCORD_TOKEN'), 'segredo-real'); cache.close();
});
