import { createCommand } from "#base";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	PermissionFlagsBits,
	TextChannel,
} from "discord.js";

createCommand({
	name: "lock",
	nameLocalizations: { "pt-BR": "bloquear" },
	description: "Bloqueia um canal ou uma categoria.",
	defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			type: ApplicationCommandOptionType.Channel,
			name: "category",
			nameLocalizations: { "pt-BR": "categoria" },
			description: "Qual categoria gostaria de bloquear?",
			channelTypes: [ChannelType.GuildCategory],
		},
	],
	async run(interaction) {
		const categoria = interaction.options.getChannel("category");
		await interaction.reply({ content: "Bloqueando...", flags: "Ephemeral" });
		if (categoria) {
			const category = interaction.guild.channels.cache.filter(
				(c) => c.parentId === categoria.id,
			);
			category.map((channel) => {
				if (channel instanceof TextChannel) {
					channel.permissionOverwrites.set(
						[
							{
								id: interaction.guildId,
								deny: [PermissionFlagsBits.SendMessages],
							},
						],
						"Lock ativado por " + interaction.user.tag,
					);
				}
				return;
			});
		}
		if (interaction.channel instanceof TextChannel) {
			interaction.channel.permissionOverwrites.set(
				[
					{
						id: interaction.guildId,
						deny: [PermissionFlagsBits.SendMessages],
					},
				],
				"Lock ativado por " + interaction.user.tag,
			);
		}
	},
});
