import { ApplicationCommandType, PermissionFlagsBits } from "discord.js";
import { createCommand } from "#base";

createCommand({
	name: "command_list",
	nameLocalizations: { "pt-BR": "lista_de_comandos" },
	description: "Lista de comandos do The Reaper.",
	defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
	type: ApplicationCommandType.ChatInput,
	async run(interaction) {
		interaction.reply({
			content:
				"Descubra os meus comandos em: https://thereaper.mintlify.app/",
			flags: "Ephemeral",
		});
	},
});
