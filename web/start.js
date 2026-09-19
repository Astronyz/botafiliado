import 'dotenv/config';
import { createCache } from '../utils/cache.js';
import { startWebServer } from './server.js';
const cache = createCache();
const server = startWebServer(cache);
process.on('SIGINT', () => server.close(() => { cache.close(); process.exit(0); }));
