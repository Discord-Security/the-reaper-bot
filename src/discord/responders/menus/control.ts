import { inspect } from "node:util";
import { createEmbed } from "@magicyan/discord";
import type { MessageCollector, TextChannel } from "discord.js";
import { ResponderType, createResponder } from "#base";
import { settings } from "#settings";
import { prisma } from "#database";

createResponder({
	customId: "control",
	types: [ResponderType.StringSelect],
	cache: "cached",
	async run(interaction) {
		const filter = (m: { author: { id: string } }) =>
			interaction.user.id === m.author.id;
		switch (interaction.values[0]) {
			case "approve":
				if (!interaction.member.permissions.has("Administrator")) return;
				interaction.deferUpdate();
				interaction.channel?.send({
					content: "Diga o ID do Servidor.",
				});
				const collectorApprove = interaction.channel?.createMessageCollector({
					filter,
					time: 300000,
					max: 1,
				}) as MessageCollector;

				collectorApprove.on("collect", async (message) => {
					const id = message.content;
					const guild = await prisma.guilds.findUnique({ where: { id } });
					guild
						? await prisma.guilds.update({
								where: { id },
								data: { approved: true },
							})
						: await prisma.guilds.create({ data: { id, approved: true } });
					const guilds = await prisma.guilds.findMany({
						where: { approved: true },
					});

					(<TextChannel>(
						interaction.client.channels.cache.get("1040362329868607629")
					)).messages
						.fetch({ limit: 1 })
						.then((msg: { first: () => any }) => {
							const fetchedMsg = msg.first();
							fetchedMsg.edit({
								content: "",
								embeds: [
									createEmbed({
										color: settings.colors.default,
										title: "Servidores no The Reaper!",
										image: "https://i.imgur.com/BAwY6H0.png",
										description:
											`Atualmente temos ${guilds.length} servidores na nossa rede: \n\n` +
											guilds
												.sort((a: { id: string }, b: { id: string }) => {
													const a1 = interaction.client.guilds.cache.get(a.id);
													const b1 = interaction.client.guilds.cache.get(b.id);
													const a1name = a1
														? a1.name
																.replace(
																	/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|)/g,
																	"",
																)
																.replace("  ", " ")
														: "";
													const b1name = b1
														? b1.name
																.replace(
																	/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|)/g,
																	"",
																)
																.replace("  ", " ")
														: "";
													return (a1 ? a1name : a.id) < (b1 ? b1name : b.id)
														? -1
														: (a1 ? a1name : a.id) > (b1 ? b1name : b.id)
															? 1
															: 0;
												})
												.map((guild: { id: string }) => {
													const nome = interaction.client.guilds.cache.get(
														guild.id,
													);
													return `\`\`\`✙ ${
														nome
															? nome.name
																	.replace(
																		/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|)/g,
																		"",
																	)
																	.replace("  ", " ")
															: guild.id
													}\`\`\``;
												})
												.join(""),
									}),
								],
							});
						});
					message.reply({ content: "Servidor aprovado com sucesso!" });
				});
				break;
			case "reject":
				if (!interaction.member.permissions.has("Administrator")) return;
				interaction.deferUpdate();
				interaction.channel?.send({
					content: "Diga o ID do Servidor.",
				});
				const collectorReject = interaction.channel?.createMessageCollector({
					filter,
					time: 300000,
					max: 1,
				}) as MessageCollector;

				collectorReject.on("collect", async (message) => {
					const id = message.content;
					const guild = interaction.client.guilds.cache.get(id);
					guild ? guild.leave() : await prisma.guilds.delete({ where: { id } });
					message.reply({ content: "Servidor rejeitado com sucesso!" });
				});
				break;
			case "eval":
				if (interaction.user.id !== "354233941550694400") return;
				interaction.deferUpdate();
				interaction.channel?.send({
					content: "Escreva um código.",
				});
				const collector = interaction.channel?.createMessageCollector({
					filter,
					time: 300000,
					max: 1,
				}) as MessageCollector;

				collector.on("collect", async (message) => {
					let code = message.content;
					const channel = message.channel as TextChannel;

					if (!code)
						return channel.send({
							embeds: [
								createEmbed({
									author: { name: "» Digite algum código" },
									color: settings.colors.default,
								}),
							],
						});
					const user = (id: string) =>
						interaction.client.users.cache.find((user) => user.id === id);
					const canal = (id: string) =>
						interaction.client.channels.cache.find((c) => c.id === id);
					const role = (id: string) =>
						message.guild?.roles.cache.find((r) => r.id === id);
					const ufetch = (id: string) => interaction.client.users.fetch(id);

					if (message.content.includes("token")) {
						const wd = createEmbed({
							author: {
								name: "» [Watch Dogs] ESTE BOT ESTÁ PROTEGIDO COM SISTEMA WATCH DOGS!",
								iconURL: "https://i.imgur.com/gMNg2dx.png",
							},
							color: settings.colors.default,
						});

						return message.reply({ embeds: [wd] });
					}

					code = code.replace(/^`{3}(js)?|`{3}$/g, "");
					code = code.replace(/<@!?(\d{16,18})>/g, "user($1)");
					code = code.replace(/<@!?(\d{16,18})>/g, "ufetch($1)");
					code = code.replace(/<#?(\d{16,18})>/g, "canal($1)");
					code = code.replace(/<@&?(\d{16,18})>/g, "role($1)");

					// biome-ignore lint/suspicious/noImplicitAnyLet: false
					let result;

					try {
						// biome-ignore lint/security/noGlobalEval: false
						const evaled = await eval(code);
						result = inspect(evaled, { depth: 0 });
					} catch (error) {
						result = error?.toString() as string;
					}
					result = result.replace(/_user\((\d{16,18})\)/g, "<@$1>");
					return channel.send(`\`\`\`${result.slice(0, 1030 - 11)}\`\`\``);
				});
				break;
		}
	},
});
