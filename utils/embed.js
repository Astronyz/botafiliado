import { EmbedBuilder } from 'discord.js';

export function productEmbed(product, { promotional = false } = {}) {
  const title = promotional ? `🔥 OFERTA: ${product.title}` : product.title;
  const embed = new EmbedBuilder().setColor(promotional ? 0xE74C3C : 0x2ECC71).setTitle(title.slice(0, 256))
    .setURL(product.affiliateUrl).addFields({ name: promotional ? '💸 PREÇO' : 'Preço', value: `**${product.price}**`, inline: true },
      { name: 'Loja', value: product.platformLabel, inline: true })
    .setDescription(`[👉 Comprar com o link de afiliado](${product.affiliateUrl})`).setTimestamp();
  if (product.image) embed.setThumbnail(product.image);
  return embed;
}
