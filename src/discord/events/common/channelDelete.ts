import { createEvent } from "#base";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import {
	ChannelType,
	GuildAuditLogsEntry,
	TextChannel,
	User,
} from "discord.js";

createEvent({
	name: "channelDelete",
	event: "channelDelete",
	async run(channel) {
		if (
			channel.type === ChannelType.GuildVoice ||
			channel.type === ChannelType.GuildStageVoice
		)
			return;
		if (
			(<TextChannel>channel).name.startsWith("ticket-") ||
			(<TextChannel>channel).name.startsWith("closed-")
		)
			return;
		let author;
		await (<TextChannel>channel).guild
			.fetchAuditLogs({ type: 12, limit: 3 })
			.then((logs) =>
				logs.entries.find(
					(entry: { target: { id: string } }) => entry.target.id === channel.id,
				),
			)
			.then((entry) => {
				author = (<GuildAuditLogsEntry>entry).executor;
			})
			.catch((error: any) => {
				if (error) return;
			});

		const embed = createEmbed({
			title: "Canal apagado - " + (<TextChannel>channel).guild.name,
			color: settings.colors.default,
			fields: [
				{
					name: "🆔 Servidor:",
					value: (<TextChannel>channel).guildId,
					inline: true,
				},
				{
					name: "🆔 Canal",
					value: `**${(<TextChannel>channel).name !== null ? (<TextChannel>channel).name : ""}** ${channel.id}`,
					inline: true,
				},
				{
					name: "👦 Autor:",
					value:
						author === undefined
							? "Desconhecido"
							: `**${(<User>author).tag}** ${(<User>author).id}`,
					inline: true,
				},
			],
			thumbnail: (<TextChannel>channel).guild.iconURL(),
		});

		(<TextChannel>(
			channel.client.channels.cache.get(settings.canais.raidAlerts)
		)).send({ embeds: [embed] });
	},
});
