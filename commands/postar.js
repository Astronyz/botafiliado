import { SlashCommandBuilder } from 'discord.js';
import { resolveProduct } from '../services/index.js';
import { productEmbed } from '../utils/embed.js';

export const data = new SlashCommandBuilder().setName('postar').setDescription('Publica uma oferta no canal configurado.')
  .addStringOption((option) => option.setName('link').setDescription('URL do produto').setRequired(true));

export async function execute(interaction, { cache }) {
  await interaction.deferReply({ ephemeral: true });
  const product = await resolveProduct(interaction.options.getString('link', true), { mlAffiliateParams: cache.getSetting('ml_affiliate_params') || process.env.ML_AFFILIATE_PARAMS });
  if (cache.wasPosted(product.platform, product.id)) throw new Error('Este produto já foi postado e foi bloqueado pelo anti-duplicidade.');
  const channelId = process.env.CANAL_POSTAGEM_ID;
  if (!channelId) throw new Error('CANAL_POSTAGEM_ID não está configurado.');
  const channel = await interaction.client.channels.fetch(channelId);
  if (!channel?.isTextBased()) throw new Error('O CANAL_POSTAGEM_ID não é um canal de texto acessível.');
  await channel.send({ content: '🚨 **PROMOÇÃO ENCONTRADA!**', embeds: [productEmbed(product, { promotional: true })] });
  cache.markPosted(product, channel.id);
  await interaction.editReply(`Oferta publicada em <#${channel.id}>.`);
}
