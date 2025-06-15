import { createEvent } from "#base";
import { PermissionFlagsBits, TextChannel } from "discord.js";
import { createEmbed } from "@magicyan/discord";
import { settings } from "#settings";

createEvent({
	name: "roleDelete",
	event: "roleDelete",
	async run(role) {
		if (
			role.permissions.has(PermissionFlagsBits.BanMembers) ||
			role.permissions.has(PermissionFlagsBits.KickMembers) ||
			role.permissions.has(PermissionFlagsBits.ModerateMembers)
		)
			return;
		let author = null;
		await role.guild
			.fetchAuditLogs({ type: 32, limit: 3 })
			.then((logs) => logs.entries.find((entry) => entry.target.id === role.id))
			.then((entry) => {
				author = entry?.executor;

				(<TextChannel>(
					role.client.channels.cache.get(settings.canais.raidAlerts)
				)).send({
					embeds: [
						createEmbed({
							title: "Cargo apagado - " + role.guild.name,
							fields: [
								{
									name: "🆔 Servidor:",
									value: role.guild.id,
									inline: true,
								},
								{
									name: "🆔 Cargo",
									value: `**${
										role.name !== null || role.name !== undefined
											? role.name
											: ""
									}** ${role.id}`,
									inline: true,
								},
								{
									name: "👦 Autor:",
									value:
										author === null || author === undefined
											? "Desconhecido"
											: `**${author.tag}** ${author.id}`,
									inline: true,
								},
							],
							thumbnail: role.guild.iconURL(),
							color: settings.colors.default,
						}),
					],
				});
			})
			.catch((error) => {
				if (error) return;
			});
	},
});
