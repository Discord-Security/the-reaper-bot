import { createEvent } from "#base";
import { prisma } from "#database";
import {
	ActivityType,
	ChannelType,
	Guild,
	PermissionFlagsBits,
	TextChannel,
} from "discord.js";
import Parser from "rss-parser";
import { CronJob } from "cron";

createEvent({
	name: "ready",
	event: "ready",
	async run(client) {
		client.user.setPresence({
			activities: [{ name: "Tóxicos? Aqui não!", type: ActivityType.Custom }],
			status: "dnd",
		});
		const not = await prisma.reapers.findUnique({ where: { id: "1" } });
		if (not) {
			not.databaseExclude.forEach((reps) => {
				new CronJob(
					reps.schedule,
					async function () {
						const reaper = await prisma.reapers.findUnique({
							where: { id: "1" },
						});
						if (reaper) {
							if (reaper.databaseExclude.find((item) => item.id === reps.id)) {
								const doc = await prisma.guilds.findUnique({
									where: { id: reps.id },
								});
								if (doc && doc.roleId) {
									const role = (<Guild>(
										client.guilds.cache.get("1025774982980186183")
									)).roles.cache.get(doc.roleId);
									if (!role) return;
									if (role.members)
										role.members.map((member) => {
											if (member.roles.cache.size > 2) return;
											member.roles.remove("1025774982980186186");
											return member.roles.add("1055623367937507438");
										});
									role.delete();
								}
								await prisma.guilds.delete({ where: { id: reps.id } });
							}
						}
					},
					null,
					true,
				);
			});
		}

		RSS();

		async function RSS() {
			const parser = new Parser();

			async function executeRSSFetch() {
				try {
					const guildsWithRssFeeds = await prisma.guilds.findMany({
						where: { rssfeeds: { some: {} } },
						include: { rssfeeds: true },
					});

					if (!guildsWithRssFeeds.length) return;

					await Promise.all(
						guildsWithRssFeeds.map(async (guild) => {
							await Promise.all(
								guild.rssfeeds.map(async (rssFeed) => {
									try {
										const data = await parser.parseURL(rssFeed.id);
										if (!data.items) return;

										// Ordenar do mais recente para o mais antigo
										const sortedItems = data.items.sort(
											(a, b) => new Date(b.pubDate as string).getTime() - new Date(a.pubDate as string).getTime()
										);

										// Pegar apenas os 10 mais recentes
										const latestItems = sortedItems.slice(0, 10);

										// Verificar se já temos itens armazenados
										const storedItems = rssFeed.items || [];
										const newItems = [];

										for (const item of latestItems) {
											const itemLink = item.link as string;

											// Se o item já foi enviado antes, pular
											if (storedItems.includes(itemLink)) continue;

											// Se houver filtros e o item não corresponder, pular
											if (rssFeed.filter?.length &&
												!rssFeed.filter.some(filter =>
													item.title?.toLowerCase().includes(filter.toLowerCase())
												)
											) continue;

											try {
												const message = JSON.parse(
													rssFeed.message
														.replace("%title", item.title?.replace(/&(quot|#821[67]);/g, "'") || "")
														.replace("%url", itemLink || "")
														.replace("%creator", item.creator || "")
														.replace("%guid", item.guid || "")
														.replace("%date", new Date(item.pubDate as string).toString())
												);

												const channel = await client.channels.fetch(rssFeed.channel).catch(() => null);
												if (channel?.isTextBased()) {
													await (<TextChannel>(channel)).send(message);
													newItems.push(itemLink);
												}
											} catch (err) {
												continue;
											}
										}

										// Atualizar os itens armazenados apenas se houver novos itens
										if (newItems.length > 0) {
											// Combinar os novos itens com os antigos, mantendo apenas os 10 mais recentes
											const updatedItems = [...newItems, ...storedItems].slice(0, 10);

											await prisma.guilds.update({
												where: { id: guild.id },
												data: {
													rssfeeds: {
														updateMany: {
															where: { id: rssFeed.id },
															data: { items: updatedItems },
														},
													},
												},
											});
										}
									} catch (err) {
										return;
									}
								})
							);
						})
					);
				} catch (err) {
					console.error("Erro geral no RSS:", err);
				} finally {
					setTimeout(executeRSSFetch, 3 * 60000);
				}
			}

			executeRSSFetch();
		}

		const guildsWithAutoMessage = await prisma.guilds.findMany({
			where: {
				automessage: {
					some: {},
				},
			},
			include: {
				automessage: true,
			},
		});
		const activeAutoMessageIntervals = new Map<string, NodeJS.Timeout | CronJob>();

		guildsWithAutoMessage.map(async (currentGuild) => {
			const autoMessages = currentGuild.automessage;
			if (autoMessages.length > 0) {
				autoMessages.forEach((currentAutoMsg) => {
					const intervalKey = `${currentGuild.id}-${currentAutoMsg.id}`;

					// Limpa o intervalo existente se existir
					if (activeAutoMessageIntervals.has(intervalKey)) {
						const existingInterval = activeAutoMessageIntervals.get(intervalKey);
						if (existingInterval instanceof CronJob) {
							existingInterval.stop();
						} else if (existingInterval) {
							clearInterval(existingInterval);
						}
					}

					let interval;
					if (currentAutoMsg.cronjob) {
						interval = new CronJob(
							currentAutoMsg.cronjob,
							async () => {
								// Verifica se aquela mensagem ainda existe
								const guild = await prisma.guilds.findUnique({
									where: { id: currentGuild.id },
								});

								if (
									guild &&
									guild.automessage.find((c) => c.id === currentAutoMsg.id)
								) {
									(<TextChannel>(
										client.channels.cache.get(currentAutoMsg.channel)
									)).send(currentAutoMsg.id);
								} else {
									// Mensagem foi apagada, limpa o intervalo
									const existingInterval = activeAutoMessageIntervals.get(intervalKey);
									if (existingInterval instanceof CronJob) {
										existingInterval.stop();
									}
									activeAutoMessageIntervals.delete(intervalKey);
								}
							},
							null,
							true,
							"America/Sao_Paulo"
						);
					} else {
						interval = setInterval(async () => {
							// Verifica se aquela mensagem ainda existe
							const guild = await prisma.guilds.findUnique({
								where: { id: currentGuild.id },
							});

							if (
								guild &&
								guild.automessage.find((c) => c.id === currentAutoMsg.id)
							) {
								(<TextChannel>(
									client.channels.cache.get(currentAutoMsg.channel)
								)).send(currentAutoMsg.id);
							} else {
								// Mensagem foi apagada, limpa o intervalo
								const existingInterval = activeAutoMessageIntervals.get(intervalKey);
								if (existingInterval && !(existingInterval instanceof CronJob)) {
									clearInterval(existingInterval);
								}
								activeAutoMessageIntervals.delete(intervalKey);
							}
						}, currentAutoMsg.interval);
					}

					// Guarda o intervalo
					activeAutoMessageIntervals.set(intervalKey, interval);
				});
			}
		});
		const guildsWithLockdown = await prisma.guilds.findMany({
			where: {
				lockdownTime: {
					not: null,
				},
			}
		});

		if (guildsWithLockdown.length > 0) {
			for (const guild of guildsWithLockdown) {
				new CronJob(
					guild.lockdownTime as Date,
					async function () {
						await prisma.guilds.update({
							where: { id: guild.id },
							data: { lockdownTime: null },
						});

						const updatedGuild = await prisma.guilds.findUnique({
							where: { id: guild.id },
						});

						if (!updatedGuild) return;

						const channels = (<Guild>(
							client.guilds.cache.get(guild.id)
						)).channels.cache
							.filter((channel) => channel.type === ChannelType.GuildText)
							.filter(
								(channel) =>
									channel
										.permissionsFor(guild.id)
										?.has(PermissionFlagsBits.ViewChannel) ?? false,
							);

						for (const channel of channels.values()) {
							if (!updatedGuild.channelsLockdown.includes(channel.id)) {
								continue;
							}

							channel.permissionOverwrites.set(
								[
									{
										id: channel.id,
										allow: [PermissionFlagsBits.SendMessages],
									},
								],
								"Modo Lockdown desativado",
							);
							const currentChannels = updatedGuild.channelsLockdown || [];

							const newChannelsLockdown = currentChannels.filter(
								(channelId: string) => channelId !== channel.id,
							);

							await prisma.guilds.update({
								where: { id: guild.id },
								data: {
									channelsLockdown: newChannelsLockdown,
								},
							});
						}
					},
					null,
					true,
				);
			}
		}
	}
}
)
