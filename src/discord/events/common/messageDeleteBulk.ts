import { createEmbed } from "@magicyan/discord";
import { AttachmentBuilder, type Client, type Guild } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { trySend } from "#functions";
import { settings } from "#settings";

createEvent({
	name: "messageDeleteBulk",
	event: "messageDeleteBulk",
	async run(messages) {
		const message = messages.first();
		const doc = await prisma.guilds.findUnique({
			where: { id: message?.guild?.id },
		});

		if (
			doc?.logs &&
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
				`O canal <#${doc.logs.deletedMessage}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/logs type: Mensagem Apagada activated: True channel:\`)`,
				message?.client as Client,
			);
		}
	},
});
