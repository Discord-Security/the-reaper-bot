import { createEmbed } from "@magicyan/discord";
import { time, type User } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { trySend } from "#functions";
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
				trySend(
					doc.logs.punishments,
					member.guild,
					{
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
					},
					`O canal <#${doc.logs.punishments}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/logs type: Punições Reaper activated: True channel:\`)`,
					member.client,
				);
			}
		}
	},
});
