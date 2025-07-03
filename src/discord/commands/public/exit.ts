import { parse } from "@lukeed/ms";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	AttachmentBuilder,
	ChannelType,
	type MessageCollector,
	PermissionFlagsBits,
	type TextChannel,
} from "discord.js";
import { createCommand } from "#base";
import { prisma } from "#database";

createCommand({
	name: "exit",
	nameLocalizations: { "pt-BR": "saída" },
	description: "Personalize a sua saída do seu jeito.",
	defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "channel",
			nameLocalizations: { "pt-BR": "canal" },
			type: ApplicationCommandOptionType.Subcommand,
			description: "Defina um canal.",
			options: [
				{
					name: "channel",
					nameLocalizations: { "pt-BR": "canal" },
					description: "Qual canal?",
					required: true,
					type: ApplicationCommandOptionType.Channel,
					channelTypes: [ChannelType.GuildText],
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "time",
			nameLocalizations: { "pt-BR": "tempo" },
			description: "Tempo limite para apagar a mensagem.",
			options: [
				{
					name: "time",
					nameLocalizations: {
						"pt-BR": "tempo",
					},
					type: ApplicationCommandOptionType.String,
					description: "Quanto tempo? (Ex: 1d, 1m, 1s)",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "message",
			nameLocalizations: { "pt-BR": "mensagem" },
			description: "Defina a mensagem de saída.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "activate",
			nameLocalizations: { "pt-BR": "ativar" },
			description: "Ative ou desative o sistema.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "export",
			nameLocalizations: { "pt-BR": "exportar" },
			description: "Exporte o conteúdo da mensagem de saída.",
		},
	],
	async run(interaction) {
		switch (interaction.options.getSubcommand(true)) {
			case "channel": {
				const channel = interaction.options.getChannel(
					"channel",
				) as TextChannel;
				interaction.reply({
					content: "Sucesso!",
					flags: "Ephemeral",
				});
				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: { exit: { channel: channel.id } },
				});
				break;
			}
			case "time": {
				const intfinal = parse(interaction.options.getString("time") as string);
				if (!intfinal) {
					interaction.reply({
						content:
							"Tempo inválido! Tente usar 1d, 1h ou 1m. Se desejar remover esse tempo, defina 0s.",
					});
					return;
				}
				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: { exit: { timeout: intfinal } },
				});
				interaction.reply({ content: "Sucesso!", flags: "Ephemeral" });
				break;
			}
			case "activate": {
				const doc = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
				});
				interaction.reply({
					content: `${doc?.exit?.active ? "Ativado" : "Desativado"} com sucesso!`,
					flags: "Ephemeral",
				});
				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: { exit: { active: !doc?.exit?.active } },
				});
				break;
			}
			case "message": {
				interaction.reply({
					content:
						"Você selecionou a opção de Mensagem. Para isso você poderá personalizar toda a sua mensagem neste [site](https://message.style/app/editor) (você deve clicar em JSON Code e enviar o código para mim), tendo em conta as mesmas variáveis do bem-vindo disponíveis em nossa documentação. Você tem 5 minutos para enviar a mensagem de saída ou diga `cancelar` para ser anulada a nova mensagem.",
				});
				const filter = (m: { author: { id: string } }) =>
					interaction.user.id === m.author.id;
				const collector = interaction.channel?.createMessageCollector({
					filter,
					time: 300000,
					max: 1,
				}) as MessageCollector;

				collector.on("collect", async (m) => {
					if (m.content === "cancelar") return;
					try {
						const pe = JSON.parse(m.content);
						interaction.channel?.send(pe).catch((err) => {
							if (err)
								interaction.channel?.send(
									"A Mensagem que você enviou está com erros para ser testada, mas não se preocupe a verificação principal foi certificada!",
								);
							return;
						});
						await prisma.guilds.update({
							where: { id: interaction.guildId },
							data: { exit: { content: m.content } },
						});
						return;
					} catch (_err) {
						interaction.channel?.send(
							"Seu JSON parece inválido!",
						);
						return;
					}
				});
				break;
			}
			case "export": {
				const doc = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
				});
				interaction.reply({
					content: "Embaixo foi exportado o arquivo JSON!",
					files: [
						new AttachmentBuilder(
							Buffer.from(
								JSON.stringify(doc?.exit?.content, null, 2)
									.substring(
										1,
										JSON.stringify(doc?.exit?.content, null, 2).length - 1,
									)
									.replace(/\\n/g, "\n")
									.replace(/\\"/g, '"')
									.replace(/\\/g, "\\n"),
							),
							{
								name: "exit.json",
							},
						),
					],
				});
				break;
			}
		}
	},
});
