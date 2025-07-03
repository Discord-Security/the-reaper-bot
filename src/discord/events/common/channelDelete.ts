import { createEmbed } from "@magicyan/discord";
import {
	ChannelType,
	type GuildAuditLogsEntry,
	type PartialUser,
	type TextChannel,
	type User,
} from "discord.js";
import { createEvent } from "#base";
import { settings } from "#settings";

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
		let author: User | PartialUser | null | undefined;
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
			.catch((error) => {
				if (error) return;
			});

		const embed = createEmbed({
			title: `Canal apagado - ${(<TextChannel>channel).guild.name}`,
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
						author === null || author === undefined
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
