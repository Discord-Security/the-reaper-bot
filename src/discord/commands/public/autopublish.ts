import { createCommand } from "#base";
import { prisma } from "#database";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	PermissionFlagsBits,
} from "discord.js";

createCommand({
	name: "autopublish",
	nameLocalizations: { "pt-BR": "autopublicar" },
	description: "Configure o seu sistema de autopublicar.",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "add",
			nameLocalizations: {
				"pt-BR": "adicionar",
			},
			type: ApplicationCommandOptionType.Subcommand,
			description: "Adicione um canal para ser autopublicado.",
			options: [
				{
					name: "channel",
					nameLocalizations: {
						"pt-BR": "canal",
					},
					description: "Este canal vai ser publicado automaticamente.",
					required: true,
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildAnnouncement],
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "remove",
			nameLocalizations: { "pt-BR": "remover" },
			description: "Remove um canal de ser autopublicado.",
			options: [
				{
					name: "channel",
					nameLocalizations: {
						"pt-BR": "canal",
					},
					description: "Este canal vai parar de ser publicado.",
					required: true,
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildAnnouncement],
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "list",
			nameLocalizations: { "pt-BR": "lista" },
			description: "Lista todos os canais do sistema.",
		},
	],
	async run(interaction) {
		const channel = interaction.options.getChannel("channel");
		switch (interaction.options.getSubcommand(true)) {
			case "add": {
				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						channelsAutopublish: {
							push: channel?.id,
						},
					},
				});
				interaction.reply({
					content: "Sucesso!",
					flags: "Ephemeral",
				});
				break;
			}
			case "remove": {
				const doc = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
				});
				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						channelsAutopublish: doc?.channelsAutopublish.filter(
							(item) => item !== channel?.id,
						),
					},
				});
				interaction.reply({
					content: "Sucesso!",
					flags: "Ephemeral",
				});
				break;
			}
			case "list": {
				const doc = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
				});
				interaction.reply({
					content: `Aqui está a lista de canais que utilizam o sistema de autopublicar:\n\n${doc?.channelsAutopublish
						.map((c) => {
							return `<#${c}>`;
						})
						.join("\n")}`,
					flags: "Ephemeral",
				});
				break;
			}
		}
	},
});
