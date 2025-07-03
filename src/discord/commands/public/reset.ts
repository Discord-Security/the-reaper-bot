import { ApplicationCommandType, PermissionFlagsBits } from "discord.js";
import { createCommand } from "#base";
import { prisma } from "#database";

createCommand({
	name: "reset",
	nameLocalizations: { "pt-BR": "resetar" },
	description:
		"Meu banco de dados irá tirar todas as configurações do seu servidor.",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput,
	async run(interaction) {
		interaction.deferReply({ flags: "Ephemeral" });
		await prisma.guilds.delete({ where: { id: interaction.guildId } });
		interaction.editReply({ content: "Feito com sucesso!" });
		await prisma.guilds.create({
			data: {
				id: interaction.guildId,
				approved: true,
			},
		});
	},
});
