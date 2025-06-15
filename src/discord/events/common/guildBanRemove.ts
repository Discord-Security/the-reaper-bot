import { createEvent } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import { TextChannel, User } from "discord.js";

createEvent({
	name: "guildBanRemove",
	event: "guildBanRemove",
	async run(member) {
		if (member.user.bot) return;

		const doc = await prisma.guilds.findUnique({
			where: { id: member.guild.id },
		});

		if (
			doc &&
			doc.logs &&
			doc.logs.punishments !== "" &&
			doc.logs.punishments !== undefined &&
			doc.logs.punishments !== null
		) {
			try {
				const fetchedLogs = await member.guild.fetchAuditLogs({
					limit: 1,
					type: 23,
				});
				const unbanLog = fetchedLogs.entries.first();

				if (!unbanLog) return;

				const { executor, target } = unbanLog;

				if ((<User>target).id === member.user.id) {
					(<TextChannel>(
						member.client.channels.cache.get(doc.logs.punishments)
					)).send({
						embeds: [
							createEmbed({
								color: settings.colors.default,
								description: `***${member.user.tag
									}* | Membro __Desbanido__**\n\n<:Discord_Danger:1028818835148656651> **Usuário:**\nTag: \`${member.user.tag
									}\`\nID: \`${member.user.id
									}\`\n\n<:Discord_Info:1036702634603728966> **Moderador:**\nTag: \`${(<User>executor).tag || "Desconhecido"
									}\`\nID: \`${(<User>executor).id || "Desconhecido"}\``,
							}),
						],
					});
				}
			} catch (err) {
				(<TextChannel>(
					member.client.channels.cache.get(settings.canais.strikes)
				)).send({
					content: `<@${member.guild.ownerId}>, seu servidor ${member.guild.name} falhou ao enviar mensagem do log de punições: ${err}`,
				});
			}
		}
	},
});
