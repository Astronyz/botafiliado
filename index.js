import 'dotenv/config';
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { createCache } from './utils/cache.js';
import * as afiliado from './commands/afiliado.js';
import * as postar from './commands/postar.js';
import * as definirMl from './commands/definir-afiliado-ml.js';

const cache = createCache();
const discordToken = cache.getConfig('DISCORD_TOKEN');
if (!discordToken) throw new Error('DISCORD_TOKEN não configurado. Copie .env.example para .env.');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection([afiliado, postar, definirMl].map((command) => [command.data.name, command]));
client.once(Events.ClientReady, (ready) => console.log(`Conectado como ${ready.user.tag}.`));
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try { await command.execute(interaction, { cache }); }
  catch (error) {
    console.error(`Falha em /${interaction.commandName}:`, error);
    const message = `❌ ${error.message || 'Erro inesperado ao processar o produto.'}`;
    if (interaction.deferred || interaction.replied) await interaction.editReply({ content: message, embeds: [] });
    else await interaction.reply({ content: message, ephemeral: true });
  }
});
process.on('SIGINT', () => { cache.close(); client.destroy(); process.exit(0); });
client.login(discordToken);
