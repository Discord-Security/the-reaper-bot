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

		setInterval(RSS, 3 * 60000);
		RSS();

		async function RSS() {
			const parser = new Parser();
			const guildsWithRssFeeds = await prisma.guilds.findMany({
				where: {
					rssfeeds: {
						some: {},
					},
				},
				include: {
					rssfeeds: true,
				},
			});

			if (guildsWithRssFeeds.length > 0) {
				guildsWithRssFeeds.map(async (guild) => {
					guild.rssfeeds.map(async (rssFeed) => {
						try {
							const data = await parser.parseURL(rssFeed.id);
							if (!data.items) return;

							// Obter os novos links do RSS
							const currentFeedItems = data.items.map(item => item.link as string);
							const newItems: string[] = [];

							for (const item of data.items) {
								// Pular se já foi processado antes
								if (
									rssFeed.items.includes(item.link as string) ||
									(rssFeed.filter && rssFeed.filter.some(filter =>
										item.title?.replace("&quot;", '"')
											.replace("&#8216;", "'")
											.replace("&#8217;", "'").toLowerCase().includes(filter.toLowerCase())
									))
								) continue;

								let message;
								try {
									message = JSON.parse(
										rssFeed.message
											.replace(
												"%title",
												item.title
													?.replace("&quot;", '"')
													.replace("&#8216;", "'")
													.replace("&#8217;", "'") as string,
											)
											.replace("%url", item.link as string)
											.replace("%creator", item.creator as string)
											.replace("%guid", item.guid as string)
											.replace(
												"%date",
												new Date(item.pubDate as string).toString(),
											),
									);
								} catch (err) {
									continue;
								}

								if (message) {
									await Promise.resolve(client.channels.fetch(rssFeed.channel))
										.then(async (channel) => {
											await (<TextChannel>channel)
												.send(message)
												.then(() => {
													// Adicionar á nova lista
													newItems.push(item.link as string);
												})
												.catch(() => {
													return;
												});
										})
										.catch(() => {
											return;
										});
								}
							}

							// Atualizar com os dados novos
							await prisma.guilds.update({
								where: {
									id: guild.id,
								},
								data: {
									rssfeeds: {
										updateMany: {
											where: {
												id: rssFeed.id,
											},
											data: {
												items: currentFeedItems,
											},
										},
									},
								},
							});
						} catch (err) {
							return;
						}
					});
				});
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
				},
				include: {
					lockdownTime: true,
				},
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
})
