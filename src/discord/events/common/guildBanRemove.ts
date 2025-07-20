import { createEmbed } from "@magicyan/discord";
import type { User } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { trySend } from "#functions";
import { settings } from "#settings";

createEvent({
	name: "guildBanRemove",
	event: "guildBanRemove",
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
				type: 23,
			});
			const unbanLog = fetchedLogs.entries.first();

			if (!unbanLog) return;

			const { executor, target } = unbanLog;

			if ((<User>target).id === member.user.id) {
				trySend(
					doc.logs.punishments,
					member.guild,
					{
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
					},
					`O canal <#${doc.logs.punishments}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/logs type: Punições Reaper activated: True channel:\`)`,
					member.client
				)
			}
		}
	},
});
