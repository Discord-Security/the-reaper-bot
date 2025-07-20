import { createEmbed } from "@magicyan/discord";
import type { TextChannel, User } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { trySend } from "#functions";
import { settings } from "#settings";

createEvent({
	name: "guildBanAdd",
	event: "guildBanAdd",
	async run(member) {
		if (member.user.bot) return;

		const doc = await prisma.guilds.findUnique({
			where: { id: member.guild.id },
		});

		const fetchedLogs = await member.guild.fetchAuditLogs({
			type: 22,
			limit: 1,
		});
		const banLog = fetchedLogs.entries.first();

		if (!banLog) return;

		const { executor, target } = banLog;

		if ((<User>executor).id !== member.client.user.id)
			(<TextChannel>(
				member.client.channels.cache.get(settings.canais.serverLogs)
			)).send({
				content: `[${new Date().toLocaleString("pt-BR")}] **${member.user.tag
					}** foi banido em **${member.guild.name}** (ID: ${member.user.id})`,
			});

		if (
			doc?.logs &&
			doc.logs.punishments !== "" &&
			doc.logs.punishments !== undefined &&
			doc.logs.punishments !== null
		) {
			if ((<User>target).id === member.user.id) {
				trySend(
					doc.logs.punishments,
					member.guild,
					{
						embeds: [
							createEmbed({
								color: settings.colors.default,
								description: `***${member.user.tag
									}* | Membro __Banido__**\n\n<:Discord_Danger:1028818835148656651> **Usuário:**\nTag: \`${member.user.tag
									}\`\nID: \`${member.user.id
									}\`\n\n<:Discord_Info:1036702634603728966> **Moderador:**\nTag: \`${(<User>executor).tag || "Desconhecido"
									}\`\nID: \`${(<User>executor).id || "Desconhecido"
									}\`\n\n<:Discord_Chat:1035624171960541244> **Motivo:**\n\`${banLog.reason || "Sem Motivo"
									}\``,
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
