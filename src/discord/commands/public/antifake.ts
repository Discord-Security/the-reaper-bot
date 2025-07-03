import { parse } from "@lukeed/ms";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	PermissionFlagsBits,
} from "discord.js";
import { createCommand } from "#base";
import { prisma } from "#database";

createCommand({
	name: "antifake",
	description: "Configure o seu antifake.",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "channel",
			nameLocalizations: {
				"pt-BR": "canal",
			},
			type: ApplicationCommandOptionType.Subcommand,
			description: "Este comando permite o envio de logs.",
			options: [
				{
					name: "channel",
					nameLocalizations: {
						"pt-BR": "canal",
					},
					description: "Este canal vai servir para enviar logs do antifake.",
					required: true,
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],
				},
			],
		},
		{
			name: "time",
			nameLocalizations: { "pt-BR": "tempo" },
			description: "Defina um tempo limite de criação de conta",
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "time",
					nameLocalizations: { "pt-BR": "tempo" },
					description: "Quanto tempo de conta? (ex: 1d, 1m, 1s)",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "punishment",
			nameLocalizations: {
				"pt-BR": "punição",
			},
			description: "Escolha a punição a ser executada.",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "action",
					nameLocalizations: { "pt-BR": "ação" },
					description: "Qual punição devia ser tomada? Kick ou Ban?",
					required: true,
					choices: [
						{ name: "banir", value: "Ban" },
						{ name: "expulsar", value: "Kick" },
					],
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "activate",
			nameLocalizations: { "pt-BR": "ativar" },
			description: "Ative ou desative o sistema anti-fake.",
		},
	],
	async run(interaction) {
		const channel = interaction.options.getChannel("channel");
		const time = interaction.options.getString("time");
		switch (interaction.options.getSubcommand(true)) {
			case "channel": {
				prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						antifake: {
							channel: channel?.id,
						},
					},
				});
				interaction.reply({
					content: "Sucesso!",
					flags: "Ephemeral",
				});
				break;
			}
			case "time": {
				const intfinal = parse(time as string);
				if (!intfinal) {
					interaction.reply({
						content: "Tempo Inválido! Teste utilizar 1d, 1h, 1m.",
					});
					return;
				}
				prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						antifake: {
							time: intfinal,
						},
					},
				});
				interaction.reply({ content: "Sucesso!", flags: "Ephemeral" });
				break;
			}
			case "punishment": {
				const action = interaction.options.getString("action") as string;
				interaction.reply({
					content: `Eu defini para ${action
						.replace("Ban", "banir")
						.replace(
							"Kick",
							"expulsar",
						)} usuários em seu servidor no anti-fake.`,
					flags: "Ephemeral",
				});
				prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						antifake: {
							action,
						},
					},
				});

				break;
			}
			case "activate": {
				const doc = await prisma.guilds.findUnique({
					where: {
						id: interaction.guildId,
					},
				});
				interaction.reply({
					content:
						"Alternado o sistema com Sucesso para " +
						(doc?.antifake?.active ? "ativado" : "desativado"),
					flags: "Ephemeral",
				});
				prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						antifake: {
							active: !doc?.antifake?.active,
						},
					},
				});
				break;
			}
		}
	},
});
