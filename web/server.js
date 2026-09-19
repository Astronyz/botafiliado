import express from 'express';
import { requestJson } from '../utils/http.js';
import { SECRET_PLACEHOLDER, getConfig, maskSecret, shouldSaveSecret } from '../utils/config.js';

const FIELDS = [
  ['DISCORD_TOKEN', 'Token Discord', true], ['DISCORD_CLIENT_ID', 'Client ID Discord'], ['DISCORD_GUILD_ID', 'Guild ID Discord'], ['CANAL_POSTAGEM_ID', 'Canal de postagem'],
  ['SHOPEE_APP_ID', 'Shopee App ID'], ['SHOPEE_APP_SECRET', 'Shopee App Secret', true], ['SHOPEE_API_URL', 'Shopee API URL'],
  ['ALIEXPRESS_APP_KEY', 'AliExpress App Key'], ['ALIEXPRESS_APP_SECRET', 'AliExpress App Secret', true], ['ALIEXPRESS_TRACKING_ID', 'AliExpress Tracking ID'], ['ALIEXPRESS_API_URL', 'AliExpress API URL'],
  ['ML_ACCESS_TOKEN', 'Mercado Livre Access Token', true], ['ML_AFFILIATE_PARAMS', 'Mercado Livre Affiliate Params'], ['DATABASE_PATH', 'Caminho do banco'], ['REQUEST_TIMEOUT_MS', 'Timeout HTTP (ms)']
];
const escape = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);

export function basicAuth(req, res, next) {
  const user = process.env.WEB_ADMIN_USER;
  const password = process.env.WEB_ADMIN_PASSWORD;
  if (!user || !password) return res.status(503).send('WEB_ADMIN_USER e WEB_ADMIN_PASSWORD são obrigatórios para habilitar o painel.');
  const credentials = req.headers.authorization?.match(/^Basic\s+(.+)$/i);
  const decoded = credentials && Buffer.from(credentials[1], 'base64').toString('utf8');
  const separator = decoded?.indexOf(':');
  if (!decoded || separator === -1 || decoded.slice(0, separator) !== user || decoded.slice(separator + 1) !== password) {
    res.set('WWW-Authenticate', 'Basic realm="Bot Afiliado"');
    return res.status(401).send('Autenticação obrigatória.');
  }
  return next();
}

function form(cache, notice = '') {
  const inputs = FIELDS.map(([key, label, sensitive]) => {
    const value = getConfig(cache, key) || '';
    const attribute = sensitive ? `value="" placeholder="${SECRET_PLACEHOLDER}"` : `value="${escape(value)}"`;
    return `<label>${escape(label)}<input name="${key}" ${sensitive ? 'type="password" data-sensitive="true"' : 'type="text"'} ${attribute}></label>`;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bot Afiliado</title>
<style>body{font:16px system-ui;max-width:900px;margin:2rem auto;padding:0 1rem;background:#f7f7f7}form,section{background:#fff;padding:1.25rem;border-radius:8px;margin:1rem 0}label{display:block;margin:.65rem 0;font-weight:600}input{display:block;box-sizing:border-box;width:100%;padding:.55rem;margin-top:.2rem}button{padding:.55rem .8rem;margin:.25rem}.notice{color:#075d22}.warning{color:#8a3d00}</style>
<h1>Configuração do Bot Afiliado</h1><p class="warning">Painel local: não exponha esta porta na internet sem HTTPS/proxy reverso.</p>${notice ? `<p class="notice">${escape(notice)}</p>` : ''}
<form method="post" action="/settings">${inputs}<button type="submit">Salvar configurações</button></form>
<section><h2>Testar conexão</h2><p>Os testes usam os valores salvos (prioridade) e o <code>.env</code> como fallback.</p>${['shopee', 'aliexpress', 'mercadolivre', 'discord'].map((name) => `<form method="post" action="/test/${name}"><button>Testar ${name}</button></form>`).join('')}</section>
<script>document.querySelectorAll('[data-sensitive]').forEach(i=>i.insertAdjacentHTML('afterend','<button type="button">mostrar</button>')&&i.nextElementSibling.addEventListener('click',()=>i.type=i.type==='password'?'text':'password'));</script></html>`;
}

export async function testConnection(platform, cache) {
  if (platform === 'mercadolivre') { await requestJson('https://api.mercadolibre.com/sites/MLB'); return 'Mercado Livre acessível.'; }
  if (platform === 'discord') {
    const token = getConfig(cache, 'DISCORD_TOKEN'); if (!token) throw new Error('DISCORD_TOKEN não configurado.');
    const user = await requestJson('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bot ${token}` } }); return `Discord autenticado como ${user.username}.`;
  }
  // Uma chamada mínima valida a configuração sem gerar links; APIs regionais podem exigir método específico.
  const url = getConfig(cache, platform === 'shopee' ? 'SHOPEE_API_URL' : 'ALIEXPRESS_API_URL');
  if (!url) throw new Error(`URL da API ${platform} não configurada.`);
  await requestJson(url, { method: 'OPTIONS' }); return `${platform} respondeu à verificação de rede.`;
}

export function createWebApp(cache) {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(basicAuth);
  app.get('/', (_req, res) => res.type('html').send(form(cache)));
  app.post('/settings', (req, res) => {
    for (const [key, , sensitive] of FIELDS) {
      const value = String(req.body[key] ?? '').trim();
      if (sensitive ? shouldSaveSecret(value) : value) cache.setSetting(key, value);
    }
    res.type('html').send(form(cache, 'Configurações salvas no SQLite. Valores vazios não substituem configurações existentes.'));
  });
  app.post('/test/:platform', async (req, res) => {
    try { res.type('html').send(form(cache, await testConnection(req.params.platform, cache))); }
    catch (error) { res.status(400).type('html').send(form(cache, `Teste falhou: ${error.message}`)); }
  });
  return app;
}

export function startWebServer(cache) {
  const port = Number(process.env.WEB_PORT || 3000);
  return createWebApp(cache).listen(port, '0.0.0.0', () => console.log(`Painel web local em http://0.0.0.0:${port}`));
}
export { FIELDS, maskSecret };
