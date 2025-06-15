import { createCommand } from "#base";
import { ApplicationCommandType, PermissionFlagsBits } from "discord.js";

createCommand({
	name: "command_list",
	nameLocalizations: { "pt-BR": "lista_de_comandos" },
	description: "Lista de comandos do The Reaper.",
	defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
	type: ApplicationCommandType.ChatInput,
	async run(interaction) {
		interaction.reply({
			content:
				"Descubra os meus comandos em: https://the-reaper.netlify.app/#/",
			flags: "Ephemeral",
		});
	},
});
