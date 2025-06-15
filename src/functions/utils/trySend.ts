import { prisma } from "#database";
import { settings } from "#settings";
import { Client, Guild, TextChannel } from "discord.js";

export const trySend = async (
	channelID: any,
	guild: Guild,
	message: any,
	errorMessage: any,
	client: Client,
) => {
	const Guilds = await prisma.guilds.findUnique({ where: { id: guild.id } });
	let mention =
		Guilds && Guilds.roleId !== undefined ? "&" + Guilds.roleId : guild.ownerId;
	mention = `<@${mention}>`;
	Promise.resolve(client.channels.fetch(channelID))
		.then((channel) => {
			(<TextChannel>channel).send(message).catch((err) => {
				(<TextChannel>client.channels.cache.get(settings.canais.strikes)).send({
					content: `${mention}, seu servidor **${guild.name}** (\`${guild.id}\`) falhou ao enviar ${errorMessage}:\n\`\`\`${err}\`\`\``,
				});
			});
		})
		.catch((err) => {
			(<TextChannel>client.channels.cache.get(settings.canais.strikes)).send({
				content: `${mention}, seu servidor **${guild.name}** (\`${guild.id}\`) falhou ao enviar ${errorMessage}:\n\`\`\`${err}\`\`\``,
			});
		});
};
