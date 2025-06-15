import { createCommand } from "#base";
import { prisma } from "#database";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	ComponentType,
	PermissionFlagsBits,
	TextInputStyle,
} from "discord.js";
import { createContainer, createModalFields, createRow, createSection, createSeparator } from "@magicyan/discord";
import { settings } from "#settings";
import { createPaste } from "dpaste-ts";

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
					required: true,
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
			description: "Filtre os títulos de algumas notícias, isto vai funcionar como um incluir.",
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
						"pt-BR": "mensagem"
					},
					description: "Qual mensagem? (Ex: melhores ofertas)",
					required: true,
				}
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
						"pt-BR": "mensagem"
					},
					description: "Qual mensagem? (Ex: melhores ofertas)",
					autocomplete: true,
					required: true,
				}
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

			if (guild && guild.rssfeeds) {
				const filtered = guild.rssfeeds.filter((choice) =>
					choice.id.toLowerCase().includes(focusedValue.value.toLowerCase()),
				);
				await interaction.respond(
					filtered.map((choice) => ({ name: choice.id, value: choice.id })),
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
			})

			if (guild && guild.rssfeeds) {
				const selectedFeed = guild.rssfeeds.find(feed => feed.id === interaction.options.getString("feed", true))

				if (selectedFeed && selectedFeed.filter) {
					const filtered = selectedFeed.filter.filter((filter) =>
						filter.toLowerCase().includes(focusedValue.value.toLowerCase())
					)
					await interaction.respond(
						filtered.map((filter) => ({ name: filter, value: filter }))
					)
				} else {
					await interaction.respond([
						{
							name: "Nenhum filtro encontrado",
							value: "none"
						}
					])
				}
			} else {
				await interaction.respond([
					{
						name: "Nenhum feed configurado",
						value: "none"
					}
				])
			}
		}
	},
	async run(interaction) {
		const doc = await prisma.guilds.findUnique({
			where: {
				id: interaction.guildId,
			},
		});
		const feed = interaction.options.getString("feed") as string;
		switch (interaction.options.getSubcommand(true)) {
			case "create": {
				const url = interaction.options.getString("url", true);
				const canal = interaction.options.getChannel("channel", true);
				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: { rssfeeds: { push: { id: url, channel: canal.id } } },
				});
				interaction.reply({ content: "Feito com sucesso." });
				break;
			}
			case "edit": {
				const rssFeed = doc?.rssfeeds.find((url) => url.id === feed);
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
						components: [createContainer({
							accentColor: settings.colors.default,
							components: [createSection(`# ${(!rssFeed.disabled ? "🟢" : "🔴")} Alterar RSS`,
								new ButtonBuilder()
									.setCustomId("state")
									.setLabel(rssFeed.disabled ? "Ativar" : "Desativar")
									.setEmoji(
										rssFeed.disabled
											? "1026116938608410647"
											: "1026116942202941561",
									)
									.setStyle(
										rssFeed.disabled ? ButtonStyle.Success : ButtonStyle.Danger,
									)),
							createSeparator(),
							createSection("## <:Discord_Star:1038602481640407050> Link RSS\n" + rssFeed.id,
								new ButtonBuilder()
									.setCustomId("link")
									.setLabel("Editar")
									.setEmoji("1383445205197262858")
									.setStyle(ButtonStyle.Secondary)),
							createSection(`## <:Discord_Channel:1035624104264470648> Canal\n <#${rssFeed.channel}>`,
								new ButtonBuilder()
									.setCustomId("channel")
									.setLabel("Editar")
									.setEmoji("1383445205197262858")
									.setStyle(ButtonStyle.Secondary)),
							createSection(`## <:Discord_Chat:1035624171960541244> Mensagem\n [No DPaste](${paste})`,
								new ButtonBuilder()
									.setCustomId("message")
									.setLabel("Editar")
									.setEmoji("1383445205197262858")
									.setStyle(ButtonStyle.Secondary))
							],
						})]
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
									const currentFeeds = doc?.rssfeeds || [];
									// Encontrar o índice do feed a ser modificado
									const feedIndex = currentFeeds.findIndex(
										(f) => f.id === rssFeed.id,
									);

									if (feedIndex !== -1) {
										// Criar uma cópia atualizada do feed
										const updatedFeed = {
											...currentFeeds[feedIndex],
											disabled: !currentFeeds[feedIndex].disabled,
										};

										// Criar novo array com a atualização
										const updatedFeeds = [...currentFeeds];
										updatedFeeds[feedIndex] = updatedFeed;

										// Atualizar no banco de dados
										await prisma.guilds.update({
											where: { id: interaction.guildId },
											data: { rssfeeds: updatedFeeds },
										});

										i.reply({
											content:
												(!updatedFeed.disabled ? "Ativado" : "Desativado") +
												" com sucesso",
										});
									}
									break;
								}
								case "link": {
									i.showModal({
										customId: "rss/link",
										title: "Alteração de link RSS",
										components: createModalFields({
											link: {
												label: "Qual o novo link RSS?",
												value: rssFeed.id,
												required: true,
												style: TextInputStyle.Short,
											},
										}),
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

										const currentFeeds = doc?.rssfeeds || [];
										const feedIndex = currentFeeds.findIndex(
											(f) => f.id === rssFeed.id,
										);

										if (feedIndex !== -1) {
											const updatedFeed = {
												...currentFeeds[feedIndex],
												id: link,
											};

											const updatedFeeds = [...currentFeeds];
											updatedFeeds[feedIndex] = updatedFeed;

											await prisma.guilds.update({
												where: { id: interaction.guildId },
												data: { rssfeeds: updatedFeeds },
											});

											enviada.reply("Atualizado com sucesso!");
										}
									}
									break;
								}
								case "channel": {
									i.reply({
										content: "Selecione um canal.",
										components: [
											createRow(
												new ChannelSelectMenuBuilder()
													.setChannelTypes(ChannelType.GuildText)
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
												const currentFeeds = doc?.rssfeeds || [];
												const feedIndex = currentFeeds.findIndex(
													(f) => f.id === rssFeed.id,
												);

												if (feedIndex !== -1) {
													const updatedFeed = {
														...currentFeeds[feedIndex],
														channel: i.values[0],
													};

													const updatedFeeds = [...currentFeeds];
													updatedFeeds[feedIndex] = updatedFeed;

													await prisma.guilds.update({
														where: { id: interaction.guildId },
														data: { rssfeeds: updatedFeeds },
													});

													i.reply({ content: "Sucesso!" });
												}
											}
										});
									});
									break;
								}
								case "message": {
									i.showModal({
										customId: "rss/message",
										title: "Alterar Mensagem",
										components: createModalFields({
											message: {
												label: "Qual a mensagem?",
												value:
													"Você selecionou a opção de Mensagem. Para isso você poderá personalizar toda a sua mensagem neste site através de JSON: https://message.style/app/editor, tendo em conta as variáveis do RSS disponíveis em nossa documentação.",
												required: true,
												placeholder: rssFeed.message,
												style: TextInputStyle.Paragraph,
											},
										}),
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
										const currentFeeds = doc?.rssfeeds || [];
										const feedIndex = currentFeeds.findIndex(
											(f) => f.id === rssFeed.id,
										);
										try {
											const pe = JSON.parse(mensagem);
											interaction.channel?.send(pe).catch((err) => {
												if (err) return;
											});
											if (feedIndex !== -1) {
												const updatedFeed = {
													...currentFeeds[feedIndex],
													message: mensagem,
												};

												const updatedFeeds = [...currentFeeds];
												updatedFeeds[feedIndex] = updatedFeed;

												await prisma.guilds.update({
													where: { id: interaction.guildId },
													data: { rssfeeds: updatedFeeds },
												});

												enviada.reply("Atualizado com sucesso!");
											}
										} catch (err) {
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
				const message = interaction.options.getString("message", true).toLowerCase();
				const doc = await prisma.guilds.findUnique({ where: { id: interaction.guildId } });
				const rssFeed = doc?.rssfeeds.find((url) => url.id === feed);
				const currentFeeds = doc?.rssfeeds || [];
				const feedIndex = currentFeeds.findIndex(
					(f) => f.id === rssFeed?.id,
				);
				const filters = rssFeed?.filter || [];

				if (feedIndex !== -1) {
					const updatedFeed = {
						...currentFeeds[feedIndex],
						filter: [...filters, message]
					};

					const updatedFeeds = [...currentFeeds];
					updatedFeeds[feedIndex] = updatedFeed;

					await prisma.guilds.update({
						where: { id: interaction.guildId },
						data: { rssfeeds: updatedFeeds },
					});

				}
				interaction.reply({ content: "Sucesso!" });

				break
			}
			case "remove_filter": {
				const message = interaction.options.getString("message", true);
				const doc = await prisma.guilds.findUnique({ where: { id: interaction.guildId } });
				const rssFeed = doc?.rssfeeds.find((url) => url.id === feed);
				const currentFeeds = doc?.rssfeeds || [];
				const feedIndex = currentFeeds.findIndex(
					(f) => f.id === rssFeed?.id,
				);
				const filters = rssFeed?.filter.filter((i) => i === message) || [];

				if (feedIndex !== -1) {
					const updatedFeed = {
						...currentFeeds[feedIndex],
						filter: [...filters]
					};

					const updatedFeeds = [...currentFeeds];
					updatedFeeds[feedIndex] = updatedFeed;

					await prisma.guilds.update({
						where: { id: interaction.guildId },
						data: { rssfeeds: updatedFeeds },
					});

				}
				interaction.reply({ content: "Sucesso!" });

				break
			}
			case "delete": {
				const doc = await prisma.guilds.findUnique({
					where: { id: interaction.guildId },
					select: { rssfeeds: true },
				});
				const newFeed = doc?.rssfeeds.filter((item) => item.id !== feed);
				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: { rssfeeds: newFeed },
				});

				interaction.reply({
					content: "Sucesso!",
					flags: "Ephemeral",
				});
				break;
			}
		}
	},
});
