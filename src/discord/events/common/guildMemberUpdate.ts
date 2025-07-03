import { createEmbed } from "@magicyan/discord";
import { type TextChannel, time, type User } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";

createEvent({
	name: "guildMemberUpdate",
	event: "guildMemberUpdate",
	async run(member) {
		if (member.user.bot) return;

		const doc = await prisma.guilds.findUnique({
			where: { id: member.guild.id },
		});

		if (
			doc?.logs &&
			doc.logs.punishments !== "" &&
			doc.logs.punishments !== undefined &&
			doc.logs.punishments !== null
		) {
			try {
				const fetchedLogs = await member.guild.fetchAuditLogs({
					limit: 1,
					type: 24,
				});
				const timeoutLog = fetchedLogs.entries.first();

				if (!timeoutLog) return;

				const { executor, target } = timeoutLog;

				if (
					(<User>target).id === member.user.id &&
					timeoutLog.changes[0].key === "communication_disabled_until" &&
					timeoutLog.changes[0].old === undefined
				) {
					(<TextChannel>(
						member.client.channels.cache.get(doc.logs.punishments)
					)).send({
						embeds: [
							createEmbed({
								color: settings.colors.default,
								description: `***${member.user.tag
									}* | Membro __Castigado__**\n\n<:Discord_Danger:1028818835148656651> **Usuário:**\nTag: \`${member.user.tag
									}\`\nID: \`${member.user.id}\`\nTempo: ${time(
										new Date(timeoutLog.changes[0].new as string),
										"R",
									)}\n\n<:Discord_Info:1036702634603728966> **Moderador:**\nTag: \`${(<User>executor).tag || "Desconhecido"
									}\`\nID: \`${(<User>executor).id || "Desconhecido"
									}\`\n\n<:Discord_Chat:1035624171960541244> **Motivo:**\n\`${timeoutLog.reason || "Sem Motivo"
									}\``,
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
