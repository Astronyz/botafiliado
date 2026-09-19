import { SlashCommandBuilder } from 'discord.js';
import { resolveProduct } from '../services/index.js';
import { productEmbed } from '../utils/embed.js';

export const data = new SlashCommandBuilder().setName('afiliado').setDescription('Gera um link de afiliado para um produto.')
  .addStringOption((option) => option.setName('link').setDescription('URL do produto').setRequired(true));

export async function execute(interaction, { cache }) {
  await interaction.deferReply({ ephemeral: true });
  const product = await resolveProduct(interaction.options.getString('link', true), { mlAffiliateParams: cache.getConfig('ML_AFFILIATE_PARAMS'), cache });
  await interaction.editReply({ content: 'Link de afiliado gerado.', embeds: [productEmbed(product)] });
}
