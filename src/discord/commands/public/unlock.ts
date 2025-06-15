import { createCommand } from "#base";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	PermissionFlagsBits,
	TextChannel,
} from "discord.js";

createCommand({
	name: "unlock",
	nameLocalizations: { "pt-BR": "desbloquear" },
	description: "Desbloqueie um canal ou todos de uma categoria.",
	defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "category",
			nameLocalizations: { "pt-BR": "categoria" },
			description: "Qual categoria deveria desbloquear?",
			type: ApplicationCommandOptionType.Channel,
			channelTypes: [ChannelType.GuildCategory],
		},
	],
	async run(interaction) {
		const categoria = interaction.options.getChannel("category");
		interaction.reply({ content: "Desbloqueando...", flags: "Ephemeral" });
		if (categoria) {
			const category = interaction.guild.channels.cache.filter(
				(c) => c.parentId === categoria.id,
			);
			if (category) {
				category.map((channel) => {
					(<TextChannel>channel).permissionOverwrites.set(
						[
							{
								id: interaction.guildId,
								allow: [PermissionFlagsBits.SendMessages],
							},
						],
						"Unlock ativado por " + interaction.user.tag,
					);
					return;
				});
				return;
			}
		}
		(<TextChannel>interaction.channel).permissionOverwrites.set(
			[
				{
					id: interaction.guildId,
					allow: [PermissionFlagsBits.SendMessages],
				},
			],
			"Unlock ativado por " + interaction.user.tag,
		);
		return;
	},
});
