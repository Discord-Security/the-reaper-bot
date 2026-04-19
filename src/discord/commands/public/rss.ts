import {
	createContainer,
	createLabel,
	createModalFields,
	createRow,
	createSection,
	createSeparator,
} from "@magicyan/discord";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	ComponentType,
	type GuildTextBasedChannel,
	PermissionFlagsBits,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { createPaste } from "dpaste-ts";
import { createCommand } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";

createCommand({
	name: "rss",
	description: "Faça RSS Feeds.",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "create",
			nameLocalizations: {
				"pt-BR": "criar",
			},
			type: ApplicationCommandOptionType.Subcommand,
			description: "Crie um leitor de RSS Feed.",
			options: [
				{
					name: "url",
					description:
						"Indique uma URL de um RSS Feed. Ex: https://imperionetwork.fr/rss.xml",
					required: true,
					autocomplete: true,
					type: ApplicationCommandOptionType.String,
				},
				{
					name: "channel",
					nameLocalizations: {
						"pt-BR": "canal",
					},
					description: "Qual canal devo publicar os artigos?",
					required: false,
					type: ApplicationCommandOptionType.Channel,
					channelTypes: [ChannelType.GuildText],
				},
			],
		},
		{
			name: "filter",
			nameLocalizations: {
				"pt-BR": "filtrar",
			},
			type: ApplicationCommandOptionType.Subcommand,
			description:
				"Filtre os títulos de algumas notícias, isto vai funcionar como um incluir.",
			options: [
				{
					name: "feed",
					description: "Indique um dos feeds acima.",
					required: true,
					autocomplete: true,
					type: ApplicationCommandOptionType.String,
				},
				{
					type: ApplicationCommandOptionType.String,
					name: "message",
					nameLocalizations: {
						"pt-BR": "mensagem",
					},
					description: "Qual mensagem? (Ex: melhores ofertas)",
					required: true,
				},
			],
		},
		{
			name: "remove_filter",
			nameLocalizations: {
				"pt-BR": "remover_filtro",
			},
			type: ApplicationCommandOptionType.Subcommand,
			description: "Remover um dos filtros que voce colocou.",
			options: [
				{
					name: "feed",
					description: "Indique um dos feeds acima.",
					required: true,
					autocomplete: true,
					type: ApplicationCommandOptionType.String,
				},
				{
					type: ApplicationCommandOptionType.String,
					name: "message",
					nameLocalizations: {
						"pt-BR": "mensagem",
					},
					description: "Qual mensagem? (Ex: melhores ofertas)",
					autocomplete: true,
					required: true,
				},
			],
		},
		{
			name: "edit",
			nameLocalizations: {
				"pt-BR": "editar",
			},
			type: ApplicationCommandOptionType.Subcommand,
			description: "Edite um leitor de RSS Feed: mensagem, canal ou URL.",
			options: [
				{
					name: "feed",
					description: "Indique um dos feeds acima.",
					required: true,
					autocomplete: true,
					type: ApplicationCommandOptionType.String,
				},
			],
		},
		{
			name: "delete",
			nameLocalizations: {
				"pt-BR": "apagar",
			},
			type: ApplicationCommandOptionType.Subcommand,
			description: "Apague uma fonte RSS do seu servidor.",
			options: [
				{
					name: "feed",
					description: "Indique um dos feeds acima.",
					required: true,
					autocomplete: true,
					type: ApplicationCommandOptionType.String,
				},
			],
		},
	],
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);

		if (focusedValue.name === "url") {
			const choices = [
				{
					name: "G1 - Notícias Locais BR",
					value: "https://g1.globo.com/rss/g1/",
				},
				{
					name: "CNN Portugal - Notícias Locais PT",
					value: "https://cnnportugal.iol.pt/rss.xml",
				},
				{
					name: "CMTV - Notícias Locais PT",
					value: "https://www.cmjornal.pt/rss",
				},
				{
					name: "Império Network - Gaming",
					value: "https://imperionetwork.fr/rss.xml",
				},
				{
					name: "GameVício - Gaming",
					value: "https://www.gamevicio.com/feed",
				},
				{
					name: "AnimeNew - Animes",
					value: "https://animenew.com.br/feed/",
				},
				{
					name: "Tecmundo - Tecnologia",
					value: "https://rss.tecmundo.com.br/feed",
				},
				{
					name: "Portal POPline - Música",
					value: "https://portalpopline.com.br/feed/",
				},
				{
					name: "CAFÉ COM NERD - Filmes/Séries",
					value: "https://cafecomnerd.com.br/feed/",
				},
			];
			const filtered = choices.filter((choice) =>
				choice.name.toLowerCase().includes(focusedValue.value.toLowerCase()),
			);
			await interaction.respond(
				filtered.map((choice) => ({ name: choice.name, value: choice.value })),
			);
		}

		if (focusedValue.name === "feed") {
			const guild = await prisma.guilds.findUnique({
				where: { id: interaction.guildId },
			});

			if (guild?.rssfeeds) {
				const filtered = guild.rssfeeds.filter((choice) =>
					choice.id.toLowerCase().includes(focusedValue.value.toLowerCase()),
				);
				await interaction.respond(
					filtered.map((choice) => ({
						name: choice.id.slice(0, 99),
						value: choice.id,
					})),
				);
			} else {
				return await interaction.respond([
					{
						name: "Não há nada listado.",
						value: "Não há nada listado.",
					},
				]);
			}
		}

		if (focusedValue.name === "message") {
			const guild = await prisma.guilds.findUnique({
				where: { id: interaction.guildId },
			});

			if (guild?.rssfeeds) {
				const selectedFeed = guild.rssfeeds.find(
					(feed) => feed.id === interaction.options.getString("feed", true),
				);

				if (selectedFeed?.filter) {
					const filtered = selectedFeed.filter.filter((filter) =>
						filter.toLowerCase().includes(focusedValue.value.toLowerCase()),
					);
					await interaction.respond(
						filtered.map((filter) => ({
							name: filter.slice(0, 99),
							value: filter,
						})),
					);
				} else {
					await interaction.respond([
						{
							name: "Nenhum filtro encontrado",
							value: "none",
						},
					]);
				}
			} else {
				await interaction.respond([
					{
						name: "Nenhum feed configurado",
						value: "none",
					},
				]);
			}
		}
	},
	async run(interaction) {
		const guildData = await prisma.guilds.findUnique({
			where: {
				id: interaction.guildId,
			},
		});
		const feedUrl = interaction.options.getString("feed") as string;
		switch (interaction.options.getSubcommand(true)) {
			case "create": {
				const url = interaction.options.getString("url", true);
				const targetChannel =
					interaction.options.getChannel("channel") ||
					(interaction.channel as GuildTextBasedChannel);
				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: { rssfeeds: { push: { id: url, channel: targetChannel.id } } },
				});
				interaction.reply({ content: "Feito com sucesso." });
				break;
			}
			case "edit": {
				const rssFeed = guildData?.rssfeeds.find((url) => url.id === feedUrl);
				if (!rssFeed) {
					interaction.reply({ content: "Nada foi encontrado." });
					return;
				}
				const paste = await createPaste({
					content: rssFeed.message,
					syntax: "json",
				});
				interaction
					.reply({
						flags: "IsComponentsV2",
						components: [
							createContainer({
								accentColor: settings.colors.default,
								components: [
									createSection(
										`# ${!rssFeed.disabled ? "🟢" : "🔴"} Alterar RSS`,
										new ButtonBuilder()
											.setCustomId("state")
											.setLabel(rssFeed.disabled ? "Ativar" : "Desativar")
											.setEmoji(
												rssFeed.disabled
													? "1026116938608410647"
													: "1026116942202941561",
											)
											.setStyle(
												rssFeed.disabled
													? ButtonStyle.Success
													: ButtonStyle.Danger,
											),
									),
									createSeparator(),
									createSection(
										"## <:Discord_Star:1038602481640407050> Link RSS\n" +
											rssFeed.id,
										new ButtonBuilder()
											.setCustomId("link")
											.setLabel("Editar")
											.setEmoji("1383445205197262858")
											.setStyle(ButtonStyle.Secondary),
									),
									createSection(
										`## <:Discord_Channel:1035624104264470648> Canal\n <#${rssFeed.channel}>`,
										new ButtonBuilder()
											.setCustomId("channel")
											.setLabel("Editar")
											.setEmoji("1383445205197262858")
											.setStyle(ButtonStyle.Secondary),
									),
									createSection(
										`## <:Discord_Chat:1035624171960541244> Mensagem\n [No DPaste](${paste})`,
										new ButtonBuilder()
											.setCustomId("message")
											.setLabel("Editar")
											.setEmoji("1383445205197262858")
											.setStyle(ButtonStyle.Secondary),
									),
								],
							}),
						],
					})
					.then((msg) => {
						const collector = msg.createMessageComponentCollector({
							componentType: ComponentType.Button,
							time: 300000,
						});
						collector.on("collect", async (i) => {
							if (i.user.id !== interaction.user.id) {
								i.reply({
									content: `Este botão não é para você usar!`,
									flags: "Ephemeral",
								});
								return;
							}

							switch (i.customId) {
								case "state": {
									const currentFeeds = guildData?.rssfeeds || [];
									const feedIndex = currentFeeds.findIndex(
										(f) => f.id === rssFeed.id,
									);

									await prisma.guilds.update({
										where: { id: interaction.guildId },
										data: {
											rssfeeds: {
												updateMany: {
													where: { id: rssFeed.id },
													data: {
														disabled: !currentFeeds[feedIndex].disabled,
													},
												},
											},
										},
									});

									i.reply({
										content: `${
											currentFeeds[feedIndex].disabled
												? "Ativado"
												: "Desativado"
										} com sucesso`,
									});
									break;
								}
								case "link": {
									i.showModal({
										customId: "rss/link",
										title: "Alteração de link RSS",
										components: createModalFields(
											createLabel(
												"Qual o novo link RSS?",
												new TextInputBuilder({
													customId: "link",
													value: rssFeed.id,
													style: TextInputStyle.Short,
													required: true,
												}),
											),
										),
									});

									const enviada = await interaction
										.awaitModalSubmit({
											time: 3600000,
											filter: (i) =>
												i.user.id === interaction.user.id &&
												i.customId === "rss/link",
										})
										.catch((error) => {
											if (error) return;
										});

									if (enviada) {
										const link = enviada.fields.getTextInputValue("link");
										if (
											!link.startsWith("http://") &&
											!link.startsWith("https://")
										) {
											enviada.reply("Link inválido.");
											return;
										}
										await prisma.guilds.update({
											where: { id: interaction.guildId },
											data: {
												rssfeeds: {
													updateMany: {
														where: { id: rssFeed.id },
														data: {
															id: link,
														},
													},
												},
											},
										});
										enviada.reply("Atualizado com sucesso!");
									}
									break;
								}
								case "channel": {
									i.reply({
										content: "Selecione um canal.",
										components: [
											createRow(
												new ChannelSelectMenuBuilder()
													.setChannelTypes([
														ChannelType.GuildText,
														ChannelType.GuildAnnouncement,
													])
													.setMaxValues(1)
													.setCustomId("canal"),
											),
										],
									}).then((m) => {
										const collector = m.createMessageComponentCollector({
											componentType: ComponentType.ChannelSelect,
											time: 300000,
											max: 1,
										});
										collector.on("collect", async (i) => {
											if (i.user.id === interaction.user.id) {
												await prisma.guilds.update({
													where: { id: interaction.guildId },
													data: {
														rssfeeds: {
															updateMany: {
																where: { id: rssFeed.id },
																data: {
																	channel: i.values[0],
																},
															},
														},
													},
												});
												i.reply({ content: "Sucesso!" });
											}
										});
									});
									break;
								}
								case "message": {
									i.showModal({
										customId: "rss/message",
										title: "Alterar Mensagem",
										components: createModalFields(
											createLabel(
												"Qual a mensagem?",
												new TextInputBuilder({
													customId: "message",
													value:
														"Você selecionou a opção de Mensagem. Para isso você poderá personalizar toda a sua mensagem neste site através de JSON: https://message.style/app/editor, tendo em conta as variáveis do RSS disponíveis em nossa documentação.",
													required: true,
													placeholder: rssFeed.message,
													style: TextInputStyle.Paragraph,
												}),
											),
										),
									});
									const enviada = await interaction
										.awaitModalSubmit({
											time: 3600000,
											filter: (i) =>
												i.user.id === interaction.user.id &&
												i.customId === "rss/message",
										})
										.catch((error) => {
											if (error) return;
										});

									if (enviada) {
										const mensagem =
											enviada.fields.getTextInputValue("message");

										try {
											const pe = JSON.parse(mensagem);
											interaction.channel?.send(pe).catch((err) => {
												if (err) return;
											});
											await prisma.guilds.update({
												where: { id: interaction.guildId },
												data: {
													rssfeeds: {
														updateMany: {
															where: { id: rssFeed.id },
															data: {
																message: mensagem,
															},
														},
													},
												},
											});

											enviada.reply("Atualizado com sucesso!");
										} catch (_err) {
											enviada.reply(
												"Seu JSON é inválido para minha inteligência, veja se você copiou tudo certo!",
											);
										}
									}
									break;
								}
							}
						});
					});

				break;
			}
			case "filter": {
				const filterMessage = interaction.options
					.getString("message", true)
					.toLowerCase();

				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						rssfeeds: {
							updateMany: {
								where: { id: feedUrl },
								data: {
									filter: {
										push: filterMessage,
									},
								},
							},
						},
					},
				});

				interaction.reply({ content: "Sucesso!" });
				break;
			}
			case "remove_filter": {
				const filterMessage = interaction.options
					.getString("message", true)
					.toLowerCase();

				const guildData = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
				});

				if (!guildData?.rssfeeds) return;

				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						rssfeeds: {
							updateMany: {
								where: { id: feedUrl },
								data: {
									filter: {
										set: guildData.rssfeeds
											.find((f) => f.id === feedUrl)
											?.filter.filter((f) => f !== filterMessage),
									},
								},
							},
						},
					},
				});

				interaction.reply({ content: "Filtro removido com sucesso!" });
				break;
			}
			case "delete": {
				const guildData = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
					select: { rssfeeds: true },
				});

				if (!guildData) {
					interaction.reply({
						content: "Servidor não encontrado no banco de dados.",
						flags: "Ephemeral",
					});
					return;
				}

				const updatedFeeds = guildData.rssfeeds
					.filter((item) => item.id !== feedUrl)
					.map((item) => ({
						...item,
						filter: item.filter || [],
						items: item.items || [],
					}));

				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: { rssfeeds: updatedFeeds },
				});

				interaction.reply({
					content: "Feed deletado com sucesso!",
					flags: "Ephemeral",
				});
				break;
			}
		}
	},
});
