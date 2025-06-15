import { createEvent } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import { TextChannel, User } from "discord.js";

createEvent({
	name: "guildBanAdd",
	event: "guildBanAdd",
	async run(member) {
		if (member.user.bot) return;

		const doc = await prisma.guilds.findUnique({
			where: { id: member.guild.id },
		});

		try {
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
					content: `[${new Date().toLocaleString("pt-BR")}] **${
						member.user.tag
					}** foi banido em **${member.guild.name}** (ID: ${member.user.id})`,
				});

			if (
				doc &&
				doc.logs &&
				doc.logs.punishments !== "" &&
				doc.logs.punishments !== undefined &&
				doc.logs.punishments !== null
			) {
				if ((<User>target).id === member.user.id) {
					(<TextChannel>(
						member.client.channels.cache.get(doc.logs.punishments)
					)).send({
						embeds: [
							createEmbed({
								color: settings.colors.default,
								description: `***${
									member.user.tag
								}* | Membro __Banido__**\n\n<:Discord_Danger:1028818835148656651> **Usuário:**\nTag: \`${
									member.user.tag
								}\`\nID: \`${
									member.user.id
								}\`\n\n<:Discord_Info:1036702634603728966> **Moderador:**\nTag: \`${
									(<User>executor).tag || "Desconhecido"
								}\`\nID: \`${
									(<User>executor).id || "Desconhecido"
								}\`\n\n<:Discord_Chat:1035624171960541244> **Motivo:**\n\`${
									banLog.reason || "Sem Motivo"
								}\``,
							}),
						],
					});
				}
			}
		} catch (err) {
			if (
				doc &&
				doc.logs &&
				doc.logs.punishments !== "" &&
				doc.logs.punishments !== undefined &&
				doc.logs.punishments !== null
			)
				(<TextChannel>(
					member.client.channels.cache.get(settings.canais.strikes)
				)).send({
					content: `<@${member.guild.ownerId}>, seu servidor ${member.guild.name} falhou ao enviar mensagem do log de punições (Ban): ${err}`,
				});
		}
	},
});
