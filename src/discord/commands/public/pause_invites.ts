import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	PermissionFlagsBits,
} from "discord.js";
import { createCommand } from "#base";

createCommand({
	name: "pausar_convites",
	nameLocalizations: { "pt-BR": "pause_invites" },
	description: "Pause temporariamente os convites do servidor.",
	defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "pause",
			nameLocalizations: { "pt-BR": "pausar" },
			description: "Quer pausar os convites?",
			required: true,
			type: ApplicationCommandOptionType.Boolean,
		},
	],
	async run(interaction) {
		const disabled = interaction.options.getBoolean("pause") as boolean;
		interaction.guild.disableInvites(disabled);
		interaction.reply({
			content: `Convites ${disabled ? "pausados" : "ativados"} com sucesso.`,
		});
	},
});
