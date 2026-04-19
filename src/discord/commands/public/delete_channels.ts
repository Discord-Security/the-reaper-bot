import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type CategoryChannel,
	ChannelType,
	PermissionFlagsBits,
} from "discord.js";
import { createCommand } from "#base";

createCommand({
	name: "delete_channels",
	nameLocalizations: { "pt-BR": "apagar_canais" },
	description: "Retire todos os canais de uma categoria.",
	defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "category",
			nameLocalizations: { "pt-BR": "categoria" },
			description: "Qual categoria gostaria de apagar?",
			required: true,
			type: ApplicationCommandOptionType.Channel,
			channelTypes: [ChannelType.GuildCategory],
		},
	],
	async run(interaction) {
		const targetCategory = interaction.options.getChannel(
			"category",
		) as CategoryChannel;
		interaction.reply({ content: "Apagando...", flags: "Ephemeral" });
		const categoryChannels = interaction.guild.channels.cache.filter(
			(c) => c.parentId === targetCategory.id,
		);
		if (categoryChannels) {
			categoryChannels.map((channel) => {
				return interaction.guild.channels.cache.get(channel.id)?.delete();
			});
		}
	},
});
