import type { InputJsonValue } from "@prisma/client/runtime/library";
import { CronJob } from "cron";
import {
	ActivityType,
	ChannelType,
	type Guild,
	PermissionFlagsBits,
	type TextChannel,
} from "discord.js";
import backup from "discord-rebackup";
import Parser from "rss-parser";
import { createEvent } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";

createEvent({
	name: "ready",
	event: "clientReady",
	async run(client) {
		client.user.setPresence({
			activities: [{ name: "Tóxicos? Aqui não!", type: ActivityType.Custom }],
			status: "dnd",
		});
		const reaperConfig = await prisma.reapers.findUnique({ where: { id: "1" } });
		if (reaperConfig) {
			reaperConfig.databaseExclude.forEach((guildToRemove) => {
				new CronJob(
					guildToRemove.schedule,
					async () => {
						const currentReaper = await prisma.reapers.findUnique({
							where: { id: "1" },
						});
						if (currentReaper) {
							if (currentReaper.databaseExclude.find((item) => item.id === guildToRemove.id)) {
								const guildData = await prisma.guilds.findUnique({
									where: { id: guildToRemove.id },
								});
								if (guildData?.roleId) {
									const role = (<Guild>(
										client.guilds.cache.get("1025774982980186183")
									)).roles.cache.get(guildData.roleId);
									if (!role) return;
									if (role.members)
										role.members.map((member) => {
											if (member.roles.cache.size > 2) return null;
											member.roles.remove("1025774982980186186");
											return member.roles.add("1055623367937507438");
										});
									role.delete();
								}
								await prisma.guilds.delete({ where: { id: guildToRemove.id } });
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

										const sortedItems = data.items
											.filter((i) => i.pubDate && i.link)
											.sort(
												(a, b) =>
													new Date(a.pubDate!).getTime() -
													new Date(b.pubDate!).getTime(),
											);

										const newFetchedItems = sortedItems.slice(-10);
										const storedLinks = new Set(rssFeed.items || []);

										const filters = rssFeed.filter.filter(Boolean) || [];
										let itemsToCheck = newFetchedItems;

										if (filters.length > 0) {
											itemsToCheck = newFetchedItems.filter((item) =>
												filters.every(
													(filter) =>
														!item.title
															?.toLowerCase()
															.includes(filter.toLowerCase()),
												),
											);
										}

										const filteredLinks = itemsToCheck.map(
											(item) => item.link!,
										);

										const uniqueLinks = [...new Set([...storedLinks, ...filteredLinks])];

										const newItems = itemsToCheck.filter(
											(item) => !storedLinks.has(item.link!),
										);

										for (const item of newItems) {
											try {
												const message = JSON.parse(
													rssFeed.message
														.replace(
															"%title",
															item.title?.replace(/&(quot|#821[67]);/g, "'") ||
																"",
														)
														.replace("%url", item.link || "")
														.replace("%creator", item.creator || "")
														.replace("%guid", item.guid || "")
														.replace(
															"%date",
															new Date(item.pubDate!).toString(),
														),
												);

												const channel = await client.channels
													.fetch(rssFeed.channel)
													.catch(() => null);
												if (channel?.isTextBased()) {
													await (channel as TextChannel).send(message);
												}
											} catch {}
										}

										await prisma.guilds.update({
											where: { id: guild.id },
											data: {
												rssfeeds: {
													updateMany: {
														where: { id: rssFeed.id },
														data: {
															items: uniqueLinks.slice(-10),
														},
													},
												},
											},
										});
									} catch {
										return;
									}
								}),
							);
						}),
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
		const activeAutoMessageIntervals = new Map<
			string,
			NodeJS.Timeout | CronJob
		>();

		guildsWithAutoMessage.map(async (guild) => {
			const autoMessages = guild.automessage;
			if (autoMessages.length > 0) {
				autoMessages.forEach((autoMsg) => {
					const intervalKey = `${guild.id}-${autoMsg.id}`;

					if (activeAutoMessageIntervals.has(intervalKey)) {
						const existingInterval =
							activeAutoMessageIntervals.get(intervalKey);
						if (existingInterval instanceof CronJob) {
							existingInterval.stop();
						} else if (existingInterval) {
							clearInterval(existingInterval);
						}
					}

					let interval: NodeJS.Timeout | CronJob;
					if (autoMsg.cronjob) {
						interval = new CronJob(
							autoMsg.cronjob,
							async () => {
								const currentGuild = await prisma.guilds.findUnique({
									where: { id: guild.id },
								});

								if (
									currentGuild?.automessage.find((c) => c.id === autoMsg.id)
								) {
									(<TextChannel>(
										client.channels.cache.get(autoMsg.channel)
									)).send(autoMsg.id);
								} else {
									const existingInterval =
										activeAutoMessageIntervals.get(intervalKey);
									if (existingInterval instanceof CronJob) {
										existingInterval.stop();
									}
									activeAutoMessageIntervals.delete(intervalKey);
								}
							},
							null,
							true,
							"America/Sao_Paulo",
						);
					} else {
						interval = setInterval(async () => {
							const currentGuild = await prisma.guilds.findUnique({
								where: { id: guild.id },
							});

							if (currentGuild?.automessage.find((c) => c.id === autoMsg.id)) {
								(<TextChannel>(
									client.channels.cache.get(autoMsg.channel)
								)).send(autoMsg.id);
							} else {
								const existingInterval =
									activeAutoMessageIntervals.get(intervalKey);
								if (
									existingInterval &&
									!(existingInterval instanceof CronJob)
								) {
									clearInterval(existingInterval);
								}
								activeAutoMessageIntervals.delete(intervalKey);
							}
						}, autoMsg.interval);
					}

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
		});

		if (guildsWithLockdown.length > 0) {
			for (const guild of guildsWithLockdown) {
				new CronJob(
					guild.lockdownTime as Date,
					async () => {
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

		new CronJob(
			"0 18 * * 1",
			async () => {
				const guildsWithAutoBackup = await prisma.guilds.findMany({
					where: {
						backup: {
							automatic: true,
						},
					},
					include: {
						backup: true,
					},
				});
				for (const guild of guildsWithAutoBackup) {
					backup
						.create(
							client.guilds.cache.get(guild.id) as unknown as Parameters<
								typeof backup.create
							>[0],
							{
								maxMessagesPerChannel: 30,
								jsonSave: true,
								jsonBeautify: true,
								saveImages: true,
								doNotBackup: ["emojis", "bans"],
							},
						)
						.then(async (backupData) => {
							await prisma.backupData.create({
								data: {
									id: backupData.id,
									rawData: backupData as unknown as InputJsonValue,
								},
							});
							const managerUser = client.users.cache.get(
								guild.backup?.userID as string,
							);
							managerUser
								?.send({
									content: `O seu backup automático foi concluído, porém guarde este código \`${backupData.id}\` para carregar o backup caso necessário.`,
								})
								.catch(() => {
									(<TextChannel>(
										client.channels.cache.get(settings.canais.strikes)
									)).send({
										content: `<@${guild.backup?.userID}>\n**Servidor:** ${backupData.name} (${backupData.guildID})\n**O que falhou**: DM fechada para ID de backup ${backupData.id}. (Recomendado: Abrir Mensagens Diretas)`,
									});
								});
						});
				}
			},
			null,
			true,
			"America/Sao_Paulo",
		);
	},
});
