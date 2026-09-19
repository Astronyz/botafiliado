import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
export const data = new SlashCommandBuilder().setName('definir-afiliado-ml').setDescription('Define os parâmetros de afiliado do Mercado Livre.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((option) => option.setName('parametros').setDescription('Ex.: matt_word=CODIGO&matt_tool=TOOL').setRequired(true));
export async function execute(interaction, { cache }) {
  const params = interaction.options.getString('parametros', true).replace(/^\?/, '');
  try { new URLSearchParams(params); } catch { throw new Error('Parâmetros inválidos.'); }
  cache.setSetting('ml_affiliate_params', params);
  await interaction.reply({ content: 'Parâmetros de afiliado do Mercado Livre salvos.', ephemeral: true });
}
