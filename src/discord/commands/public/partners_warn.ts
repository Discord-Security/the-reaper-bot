import { createCommand } from "#base";
import { prisma } from "#database";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonInteraction,
	ChannelType,
	ColorResolvable,
	EmbedBuilder,
	InteractionCollector,
	Message,
	PermissionFlagsBits,
	TextChannel,
} from "discord.js";
import { createEmbed, createRow } from "@magicyan/discord";
import { settings } from "#settings";

createCommand({
	name: "partners_warn",
	nameLocalizations: { "pt-BR": "parcerias_aviso" },
	description: "Configure o aviso de nova parceria.",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "channel",
			nameLocalizations: {
				"pt-BR": "canal",
			},
			type: ApplicationCommandOptionType.Subcommand,
			description: "Defina um canal.",
			options: [
				{
					name: "channel",
					nameLocalizations: {
						"pt-BR": "canal",
					},
					description: "Qual canal?",
					required: true,
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "message",
			nameLocalizations: { "pt-BR": "mensagem" },
			description: "Defina uma mensagem.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "rank",
			nameLocalizations: { "pt-BR": "classificação" },
			description: "Veja a classificação dos seus staffs de parceria.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "info",
			nameLocalizations: { "pt-BR": "informação" },
			description: "Explicação do sistema.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "activate",
			nameLocalizations: { "pt-BR": "ativar" },
			description: "Ative o sistema.",
		},
	],
	async run(interaction) {
		switch (interaction.options.getSubcommand(true)) {
			case "rank": {
				await interaction.reply({ content: "Pesquisando..." });
				let page: number;
				let buttonname: string | number;
				let collector:
					| InteractionCollector<ButtonInteraction<"cached">>
					| undefined;

				async function Search(pagina: number) {
					const paginate = await prisma.partners
						.findMany({
							where: {
								serverId: interaction.guildId,
							},
							take: 15,
							skip: (pagina - 1) * 15,
							orderBy: {
								partners: "desc",
							},
						})
						.catch((err: any) => {
							if (err)
								interaction.editReply({
									content: "Consulta inválida",
								});
						});

					const total = await prisma.partners.count({
						where: {
							serverId: interaction.guildId,
						},
					});

					const totalPages = Math.ceil(total / 15);
					page = pagina;

					const paginateData = {
						docs: paginate,
						totalDocs: total,
						limit: 15,
						totalPages,
						page: pagina,
						pagingCounter: (pagina - 1) * 15 + 1,
						hasPrevPage: pagina > 1,
						hasNextPage: pagina < totalPages,
						prevPage: pagina - 1,
						nextPage: pagina + 1,
					};
					const str2 = Math.floor(Math.random() * 100);
					buttonname = str2;
					const botao = createRow(
						new ButtonBuilder()
							.setCustomId(str2 + "prev")
							.setEmoji("1069621736397607052")
							.setStyle(2)
							.setDisabled(!paginateData.hasPrevPage),
						new ButtonBuilder()
							.setCustomId(str2 + "next")
							.setEmoji("1041100297629597836")
							.setStyle(2)
							.setDisabled(!paginateData.hasNextPage),
					);
					const top = new EmbedBuilder()
						.setTitle("🏆 » TOP 15 STAFFS PARCERIA")
						.setFooter({
							text: `Página ${paginateData.page} de ${paginateData.totalPages} páginas`,
						})
						.setColor(settings.colors.default as ColorResolvable);
					if (paginateData.docs) {
						const fields = paginateData.docs.map(
							(
								w: { id: string; partners: number; serverId: string },
								index: number,
							) => ({
								name: `${paginateData.pagingCounter + index}. ${interaction.guild.members.cache.get(w.id.split("-")[0])
										? interaction.guild.members.cache.get(w.id.split("-")[0])
											?.user.username
										: w.id
									}`,
								value: `**Parcerias no total:** ${w.partners.toLocaleString(
									"pt-BR",
								)}`,
								inline: true,
							}),
						);
						top.addFields(...fields);
					}
					const mensagem = await interaction.editReply({
						content: null,
						embeds: [top],
						components: [botao],
					});
					const filter = (interaction: { customId: string }) =>
						interaction.customId === buttonname + "next" ||
						interaction.customId === buttonname + "prev";
					collector = mensagem.createMessageComponentCollector({
						filter,
						time: 300000,
					}) as InteractionCollector<ButtonInteraction<"cached">>;
				}

				await Search(1);

				collector?.on(
					"collect",
					(i) => {
						if (i.user.id !== interaction.member.id) {
							i.editReply({
								content: "Consulta inválida.",
							});
							return
						}

						if (i.customId === buttonname + "next") {
							i.deferUpdate();
							Search(page + 1);
						}
						if (i.customId === buttonname + "prev") {
							i.deferUpdate();
							Search(page - 1);
						}
					},
				);
				break;
			}
			case "message": {
				interaction.reply({
					content:
						"Você escolheu a opção de mensagem. Para personalizar sua mensagem, visite este [site](https://message.style/app/editor) e copie o JSON. Por favor, lembre-se das variáveis de parcerias disponíveis na nossa documentação. Você tem 5 minutos para enviar a mensagem de agradecimento de parcerias ou digite cancelar para anular a nova mensagem.",
				});
				const filter = (m: Message) => interaction.user.id === m.author.id;
				const collector = interaction.channel?.createMessageCollector({
					filter,
					time: 300000,
					max: 1,
				});

				collector?.on("collect", async (m) => {
					if (m.content === "cancelar") return;
					try {
						const pe = JSON.parse(m.content);
						interaction.channel?.send(pe).catch(() => {
							interaction.channel?.send(
								"A mensagem que você enviou está com erros para ser testada, mas não se preocupe a verificação principal foi certificada!",
							);
						});
						await prisma.guilds.update({
							where: { id: interaction.guildId },
							data: { partnerWarning: { message: m.content } },
						});
					} catch (err) {
						interaction.channel?.send(
							"Seu JSON é inválido para minha inteligência, veja se você copiou tudo!",
						);
					}
				});
				break;
			}
			case "channel": {
				const channel = interaction.options.getChannel(
					"channel",
				) as TextChannel;
				interaction.reply("Definido com sucesso para esse canal.");
				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: { partnerWarning: { channel: channel.id } },
				});
				break;
			}
			case "activate": {
				const doc = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
					select: { partnerWarning: true },
				});
				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						partnerWarning: { activated: !doc?.partnerWarning?.activated },
					},
				});
				interaction.reply(
					`Defini o agradecimento de parcerias para ${doc?.partnerWarning?.activated ? "ativado" : "desativado"
					}.`,
				);
				break;
			}
			case "info": {
				interaction.reply({
					embeds: [
						createEmbed({
							title: "Como funciona?",
							color: settings.colors.default,
							description:
								"Este é um sistema muito simples, cada vez que um staff de parceria fizer uma parceria, eu irei avisar uma mensagem totalmente á sua escolha, com algumas variáveis pré-definidas, basta apenas usar todos os comandos de forma correta.",
						}),
					],
				});
				break;
			}
		}
	},
});
