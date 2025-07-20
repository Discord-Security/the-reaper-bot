import type { Client, Guild, MessageCreateOptions, TextChannel } from "discord.js";
import { prisma } from "#database";
import { settings } from "#settings";

export const trySend = async (
	channelID: string,
	guild: Guild,
	message: MessageCreateOptions,
	errorMessage: string,
	client: Client,
) => {
	const Guilds = await prisma.guilds.findUnique({ where: { id: guild.id } });
	let mention =
		Guilds && Guilds.roleId !== undefined ? `&${Guilds.roleId}` : guild.ownerId;
	mention = `<@${mention}>`;
	Promise.resolve(client.channels.fetch(channelID))
		.then((channel) => {
			(<TextChannel>channel).send(message).catch((err) => {
				(<TextChannel>client.channels.cache.get(settings.canais.strikes)).send({
					content: `${mention}\n**Servidor:** ${guild.name} (\`${guild.id}\`)\n**O que falhou**: ${errorMessage}\n**Erro para o desenvolvedor:**\n\`\`\`${err}\`\`\``,
				});
			});
		})
		.catch((err) => {
			(<TextChannel>client.channels.cache.get(settings.canais.strikes)).send({
				content: `${mention}\n**Servidor:** ${guild.name} (\`${guild.id}\`)\n**O que falhou**: ${errorMessage}\n**Erro para o desenvolvedor:**\n\`\`\`${err}\`\`\``,
			});
		});
};
