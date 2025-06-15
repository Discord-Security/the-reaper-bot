import { createEvent } from "#base";
import { prisma } from "#database";
import { trySend } from "#functions";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import { Guild } from "discord.js";

createEvent({
	name: "messageDelete",
	event: "messageDelete",
	async run(message) {
		if (message.author?.bot) return;

		const doc = await prisma.guilds.findUnique({
			where: { id: message.guild?.id },
		});

		if (!(message.attachments.size >= 1) && !message.content) return;

		if (
			doc &&
			doc.logs &&
			doc.logs.deletedMessage !== "" &&
			doc.logs.deletedMessage !== undefined &&
			doc.logs.deletedMessage !== null
		) {
			const fields = [
				{ name: "Canal:", value: `${message.channel.toString()}` },
			];

			if (message.content) {
				fields.unshift({
					name: "Conteúdo da Mensagem:",
					value: `\`\`\`ansi\n[2;31m${message.content.substr(
						0,
						800,
					)}[0m[2;31m[0m\n\`\`\``,
				});
			}

			if (message.attachments.size >= 1) {
				fields.push({
					name: "Arquivos:",
					value: `${message.attachments.map((a) => a.url)}`,
				});
			}

			trySend(
				doc.logs.deletedMessage,
				message.guild as Guild,
				{
					embeds: [
						createEmbed({
							color: settings.colors.default,
							description: `***${message.author?.tag}* | Mensagem __Deletada__**`,
							fields,
							image: "https://i.imgur.com/Youft1w.png",
							footer: { text: "ID do Usuário: " + message.author?.id },
						}),
					],
				},
				"logs de mensagem apagada",
				message.client,
			);
		}
	},
});
