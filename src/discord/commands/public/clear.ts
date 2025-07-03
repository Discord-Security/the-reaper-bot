import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	PermissionFlagsBits,
} from "discord.js";
import { createCommand } from "#base";

createCommand({
	name: "clear",
	nameLocalizations: { "pt-BR": "limpar" },
	description: "Limpe algumas mensagens do chat.",
	defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "messages",
			nameLocalizations: { "pt-BR": "mensagens" },
			description: "Quantas mensagens?",
			required: true,
			minValue: 2,
			maxValue: 100,
			type: ApplicationCommandOptionType.Integer,
		},
		{
			name: "member",
			nameLocalizations: {
				"pt-BR": "membro",
			},
			type: ApplicationCommandOptionType.User,
			description: "De quem as mensagens deveriam ser limpas?",
		},
	],
	async run(interaction) {
		const clean = interaction.options.getInteger("messages") as number;
		const member = interaction.options.getUser("member");
		if (member)
			return interaction.channel?.messages
				.fetch({
					limit: clean,
				})
				.then((messages) => {
					interaction.channel
						?.bulkDelete(
							messages.filter((m) => m.author.id === member.id),
							true,
						)
						.then(() => {
							interaction.reply({
								content: `Limpei ${clean.toString()} mensagens do usuário selecionado.`,
								flags: "Ephemeral",
							});
						});
				});
		return interaction.channel?.bulkDelete(clean, true).then(() => {
			interaction.reply({
				content: `Limpei ${clean.toString()} mensagens.`,
				flags: "Ephemeral",
			});
		});
	},
});
