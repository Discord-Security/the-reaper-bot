import { createEvent } from "#base";
import { prisma } from "#database";
import { trySend } from "#functions";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import { cleanContent } from "discord.js";
import { diffChars } from "diff";

createEvent({
	name: "messageUpdate",
	event: "messageUpdate",
	async run(oldmessage, message) {
		if (message.guild === null) return;
		if (message.author.bot) return;

		if (oldmessage.content === message.content) return;
		if (!oldmessage.content) return;

		const doc = await prisma.guilds.findUnique({
			where: { id: message.guildId as string },
		});

		if (
			doc &&
			doc.logs &&
			doc.logs.editedMessage !== "" &&
			doc.logs.editedMessage !== null
		) {
			const diff = diffChars(
				cleanContent(oldmessage.content as string, message.channel).replaceAll(
					"```",
					"``ˋ",
				),
				cleanContent(message.content, message.channel).replaceAll("```", "``ˋ"),
			);
			let oldContentDiff = diff
				.map((part) => {
					if (part.added) return "";
					if (part.removed) return `\u001b[41m${part.value}`;
					return `\u001b[0m${part.value}`;
				})
				.join("");
			let newContentDiff = diff
				.map((part) => {
					if (part.added) return `\u001b[45m${part.value}`;
					if (part.removed) return "";
					return `\u001b[0m${part.value}`;
				})
				.join("");
			if (oldContentDiff.length > 512 && newContentDiff.length > 512) {
				if (oldContentDiff.slice(0, 512) === newContentDiff.slice(0, 512)) {
					oldContentDiff = `[...]\`\`\`ansi\n${oldContentDiff.slice(
						-512,
					)}\n\`\`\``;
					newContentDiff = `[...]\`\`\`ansi\n${newContentDiff.slice(
						-512,
					)}\n\`\`\``;
				} else {
					oldContentDiff = `\`\`\`ansi\n${oldContentDiff.slice(
						0,
						512,
					)}\n\`\`\`[...]\n`;
					newContentDiff = `\`\`\`ansi\n${newContentDiff.slice(
						0,
						512,
					)}\n\`\`\`[...]\n`;
				}
			} else {
				if (oldContentDiff.length > 512) {
					oldContentDiff = `\`\`\`ansi\n${oldContentDiff.slice(
						0,
						512,
					)}\n\`\`\`[...]\n`;
				} else {
					oldContentDiff =
						oldContentDiff && `\`\`\`ansi\n${oldContentDiff}\n\`\`\``;
				}
				if (newContentDiff.length > 512) {
					newContentDiff = `\`\`\`ansi\n${newContentDiff.slice(
						0,
						512,
					)}\n\`\`\`[...]\n`;
				} else {
					newContentDiff =
						newContentDiff && `\`\`\`ansi\n${newContentDiff}\n\`\`\``;
				}
			}

			const fields = [
				{
					name: "Conteúdo da Mensagem Antigo: ",
					value: oldContentDiff,
				},
				{
					name: "Conteúdo da Mensagem Novo:",
					value: newContentDiff,
				},
				{ name: "Canal:", value: message.channel.toString() },
			];

			if (message.attachments.size >= 1) {
				fields.push({
					name: "Arquivos:",
					value: `${message.attachments.map((a) => a.url)}`,
				});
			}
			trySend(
				doc.logs.editedMessage,
				message.guild,
				{
					embeds: [
						createEmbed({
							description: `***${message.author.tag}* | Mensagem __Editada__**`,
							color: settings.colors.default,
							fields,
							image: "https://i.imgur.com/thr2RcM.png",
							footer: { text: "ID do Usuário: " + message.author.id },
						}),
					],
				},
				"logs de mensagem editada",
				message.client,
			);
		}
	},
});
