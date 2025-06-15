import { createCommand } from "#base";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	AttachmentBuilder,
	ChannelType,
	MessageCollector,
	PermissionFlagsBits,
	Role,
	TextChannel,
} from "discord.js";
import { parse } from "@lukeed/ms";
import { prisma } from "#database";

createCommand({
	name: "welcome",
	nameLocalizations: { "pt-BR": "bem-vindo" },
	description: "Personalize as suas boas-vindas do seu jeito.",
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
			description: "Defina a mensagem de boas-vindas.",
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
			description: "Exporte o conteúdo da mensagem de boas-vindas.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "test",
			nameLocalizations: { "pt-BR": "testar" },
			description: "Irei enviar o boas-vindas no seu servidor.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "addrole",
			nameLocalizations: { "pt-BR": "adicionarcargo" },
			description: "Adicione um cargo para ser oferecido ao entrar.",
			options: [
				{
					type: ApplicationCommandOptionType.Role,
					name: "role",
					nameLocalizations: {
						"pt-BR": "cargo",
					},
					description: "Qual cargo?",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "removerole",
			nameLocalizations: { "pt-BR": "removercargo" },
			description: "Remove um cargo ao autorole.",
			options: [
				{
					type: ApplicationCommandOptionType.Role,
					name: "role",
					nameLocalizations: {
						"pt-BR": "cargo",
					},
					description: "Qual cargo?",
					required: true,
				},
			],
		},
	],
	async run(interaction) {
		switch (interaction.options.getSubcommand(true)) {
			case "channel": {
				const channel = interaction.options.getChannel(
					"channel",
				) as TextChannel;
				prisma.guilds.update({
					where: { id: interaction.guildId },
					data: { welcome: { channel: channel.id } },
				});
				interaction.reply({
					content: "Sucesso!",
					flags: "Ephemeral",
				});
				break;
			}
			case "time": {
				const time = interaction.options.getString("time") as string;
				const intfinal = parse(time);
				if (!intfinal) {
					interaction.reply({
						content:
							"Tempo inválido! Tente usar 1d, 1h ou 1m. Se desejar remover esse tempo, defina 0s.",
					});
					return;
				}
				prisma.guilds.update({
					where: { id: interaction.guildId },
					data: { welcome: { timeout: intfinal } },
				});
				interaction.reply({ content: "Sucesso!", flags: "Ephemeral" });
				break;
			}
			case "activate": {
				const doc = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
					select: { welcome: true },
				});
				prisma.guilds.update({
					where: { id: interaction.guildId },
					data: { welcome: { active: !doc?.welcome?.active } },
				});
				interaction.reply({
					content: `${doc?.welcome?.active ? "Ativado" : "Desativado"
						} com sucesso!`,
					flags: "Ephemeral",
				});
				break;
			}
			case "export": {
				const doc = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
					select: { welcome: true },
				});
				interaction.reply({
					content: "Embaixo foi exportado o arquivo JSON!",
					files: [
						new AttachmentBuilder(
							Buffer.from(
								JSON.stringify(doc?.welcome?.content, null, 2)
									.substring(
										1,
										JSON.stringify(doc?.welcome?.content, null, 2).length - 1,
									)
									.replace(/\\n/g, "\n")
									.replace(/\\"/g, '"')
									.replace(/\\/g, "\\n"),
							),
							{
								name: "welcome.json",
							},
						),
					],
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
						interaction.channel?.send(pe).catch(() => {
							interaction.channel?.send(
								"A Mensagem que você enviou está com erros para ser testada, mas não se preocupe a verificação principal foi certificada!",
							);
							return;
						});
						prisma.guilds.update({
							where: { id: interaction.guildId },
							data: { welcome: { content: m.content } },
						});
					} catch (err) {
						interaction.channel?.send(
							"Seu JSON é inválido para os parâmetros que tenho, veja se você copiou tudo!",
						);
					}
				});
				break;
			}
			case "addrole": {
				const cargo = interaction.options.getRole("role") as Role;

				const doc = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
					select: { welcome: true },
				});

				const currentRoles = doc?.welcome?.roles || [];

				// Verificar se o cargo já existe
				if (!currentRoles.includes(cargo.id)) {
					await prisma.guilds.update({
						where: { id: interaction.guildId },
						data: {
							welcome: {
								roles: [...currentRoles, cargo.id],
							},
						},
					});
				}

				interaction.reply({
					content: "Sucesso!",
					flags: "Ephemeral",
				});
				break;
			}

			case "removerole": {
				const cargo = interaction.options.getRole("role") as Role;

				// Buscar dados atuais
				const doc = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
					select: { welcome: true },
				});

				const currentRoles = doc?.welcome?.roles || [];
				const updatedRoles = currentRoles.filter(
					(roleId: string) => roleId !== cargo.id,
				);

				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						welcome: {
							roles: updatedRoles,
						},
					},
				});

				interaction.reply({
					content: "Sucesso!",
					flags: "Ephemeral",
				});
				break;
			}
			case "test": {
				interaction.reply({
					content: "Evento emitido com sucesso.",
					flags: "Ephemeral",
				});
				interaction.client.emit("guildMemberAdd", interaction.member);
			}
		}
	},
});
