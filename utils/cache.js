import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function createCache(databasePath = process.env.DATABASE_PATH || './data/botafiliado.sqlite') {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS posted_products (
    platform TEXT NOT NULL, product_id TEXT NOT NULL, posted_at TEXT NOT NULL,
    channel_id TEXT, affiliate_url TEXT NOT NULL,
    PRIMARY KEY (platform, product_id)
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const has = db.prepare('SELECT 1 FROM posted_products WHERE platform = ? AND product_id = ?');
  const add = db.prepare(`INSERT INTO posted_products(platform, product_id, posted_at, channel_id, affiliate_url)
    VALUES (?, ?, ?, ?, ?)`);
  const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
  const deleteSetting = db.prepare('DELETE FROM settings WHERE key = ?');
  const setSetting = db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  return {
    wasPosted: (platform, productId) => Boolean(has.get(platform, productId)),
    markPosted: (product, channelId) => add.run(product.platform, product.id, new Date().toISOString(), channelId, product.affiliateUrl),
    getSetting: (key) => getSetting.get(key)?.value,
    // Valores salvos no painel têm prioridade; .env mantém compatibilidade como fallback.
    getConfig: (key) => getSetting.get(key)?.value ?? process.env[key],
    setSetting: (key, value) => setSetting.run(key, value),
    deleteSetting: (key) => deleteSetting.run(key),
    close: () => db.close()
  };
}
