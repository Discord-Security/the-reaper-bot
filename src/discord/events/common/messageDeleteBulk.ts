import { createEvent } from "#base";
import { prisma } from "#database";
import { trySend } from "#functions";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import { AttachmentBuilder, Client, Guild } from "discord.js";

createEvent({
	name: "messageDeleteBulk",
	event: "messageDeleteBulk",
	async run(messages) {
		const message = messages.first();
		const doc = await prisma.guilds.findUnique({
			where: { id: message?.guild?.id },
		});

		if (
			doc &&
			doc.logs &&
			doc.logs.deletedMessage !== "" &&
			doc.logs.deletedMessage !== undefined &&
			doc.logs.deletedMessage !== null
		) {
			const msgs = messages
				.map((message) => `[${message.author?.tag}]: ${message.content}`)
				.join("\n");

			const lista = new AttachmentBuilder(Buffer.from(msgs), {
				name: "messageDeleteBulk.txt",
			});

			trySend(
				doc.logs.deletedMessage,
				message?.guild as Guild,
				{
					embeds: [
						createEmbed({
							description: `**Mensagens __Deletadas__**`,
							color: settings.colors.default,
							fields: [
								{
									name: "Conteúdo das Mensagens:",
									value: "No arquivo .TXT",
								},
								{ name: "Canal:", value: `<#${message?.channel.id}>` },
							],
							image: "https://i.imgur.com/Youft1w.png",
						}),
					],
					files: [lista],
				},
				"logs de mensagem apagada",
				message?.client as Client,
			);
		}
	},
});
