import { createCommand } from "#base";
import { prisma } from "#database";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	PermissionFlagsBits,
	TextChannel,
} from "discord.js";
import { parse } from "@lukeed/ms";
import { formatLong } from "functions/utils/formatLong.js";
import { CronJob } from "cron";

createCommand({
	name: "automessage",
	nameLocalizations: { "pt-BR": "automensagem" },
	description: "Configure o seu sistema de automensagem.",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "add",
			nameLocalizations: {
				"pt-BR": "adicionar",
			},
			type: ApplicationCommandOptionType.Subcommand,
			description: "Adiciona uma nova mensagem automática.",
			options: [
				{
					name: "channel",
					nameLocalizations: {
						"pt-BR": "canal",
					},
					description: "Este canal vai enviar a sua mensagem.",
					required: true,
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],
				},
				{
					type: ApplicationCommandOptionType.String,
					required: true,
					name: "time",
					nameLocalizations: { "pt-BR": "tempo" },
					description:
						"De quanto em quanto tempo a mensagem deve ser enviada? (Ex: 10m, 6h, 1d)",
				},
				{
					type: ApplicationCommandOptionType.String,
					required: true,
					name: "message",
					nameLocalizations: { "pt-BR": "mensagem" },
					description: "Qual a mensagem a ser enviada?",
				},
			],
		},
		{
			name: "cronjob",
			type: ApplicationCommandOptionType.Subcommand,
			description: "(Avançado) Adiciona uma nova mensagem automática - mas com cronjob.",
			options: [
				{
					name: "channel",
					nameLocalizations: {
						"pt-BR": "canal",
					},
					description: "Este canal vai enviar a sua mensagem.",
					required: true,
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],
				},
				{
					type: ApplicationCommandOptionType.String,
					required: true,
					name: "cronjob",
					description:
						"Envie seu cronjob - A hospedagem está definida com horário America/Sao_Paulo.",
				},
				{
					type: ApplicationCommandOptionType.String,
					required: true,
					name: "message",
					nameLocalizations: { "pt-BR": "mensagem" },
					description: "Qual a mensagem a ser enviada?",
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "remove",
			nameLocalizations: { "pt-BR": "remover" },
			description: "Remove uma mensagem automática.",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "message",
					nameLocalizations: { "pt-BR": "mensagem" },
					description: "Qual mensagem?",
					required: true,
					autocomplete: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "list",
			nameLocalizations: { "pt-BR": "lista" },
			description: "Lista todas as mensagens do sistema.",
		},
	],
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();
		const guild = await prisma.guilds.findUnique({
			where: { id: interaction.guildId },
		});

		if (guild && guild.automessage) {
			const filtered = guild.automessage.filter((choice) =>
				choice.id.toLowerCase().includes(focusedValue.toLowerCase()),
			);
			return interaction.respond(
				filtered.map((choice) => ({ name: choice.id, value: choice.id })),
			);
		}

		return interaction.respond([
			{
				name: "Não há nada listado.",
				value: "Não há nada listado.",
			},
		]);
	},
	async run(interaction) {
		const mensagem = interaction.options.getString("message");
		const doc = await prisma.guilds.findUnique({
			where: { id: interaction.guildId },
		});
		const activeIntervals = new Map<string, NodeJS.Timeout | CronJob>();
		switch (interaction.options.getSubcommand(true)) {
			case "add": {
				const channel = interaction.options.getChannel("channel");
				const tempo = interaction.options.getString("time");
				const intervalTime = parse(tempo as string) as number;
				const messageId = mensagem as string;

				if (activeIntervals.has(messageId)) {
					const interval = activeIntervals.get(messageId);
					if (interval instanceof CronJob) {
						interval.stop();
					} else if (interval) {
						clearInterval(interval);
					}
				}

				const interval = setInterval(async () => {
					const doc2 = await prisma.guilds.findUnique({
						where: { id: interaction.guildId },
					});
					if (doc2?.automessage.some((c) => c.id === messageId)) {
						(<TextChannel>(
							interaction.guild.channels.cache.get(channel?.id as string)
						)).send(messageId);
					}
				}, intervalTime);

				activeIntervals.set(messageId, interval);

				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						automessage: {
							push: {
								id: messageId,
								interval: intervalTime,
								channel: channel?.id as string,
							},
						},
					},
				});

				interaction.reply({
					content: "Sucesso!",
					flags: "Ephemeral",
				});
				break;
			}
			case "cronjob": {
				const channel = interaction.options.getChannel("channel", true);
				const cronjobPattern = interaction.options.getString("cronjob", true);
				const messageId = mensagem as string;

				if (activeIntervals.has(messageId)) {
					const interval = activeIntervals.get(messageId);
					if (interval instanceof CronJob) {
						interval.stop();
					} else if (interval) {
						clearInterval(interval);
					}
				}

				const job = new CronJob(cronjobPattern, async () => {
					const doc2 = await prisma.guilds.findUnique({
						where: { id: interaction.guildId },
					});
					if (doc2?.automessage.some((c) => c.id === messageId)) {
						(<TextChannel>(
							interaction.guild.channels.cache.get(channel?.id as string)
						)).send(messageId);
					}
				}, null, true, "America/Sao_Paulo");

				job.start();
				activeIntervals.set(messageId, job);

				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						automessage: {
							push: {
								id: messageId,
								interval: 0,
								cronjob: cronjobPattern,
								channel: channel?.id as string,
							},
						},
					},
				});

				interaction.reply({
					content: "Sucesso!",
					flags: "Ephemeral",
				});
				break;
			}
			case "remove": {
				const messageId = mensagem as string;

				if (activeIntervals.has(messageId)) {
					const interval = activeIntervals.get(messageId);
					if (interval instanceof CronJob) {
						interval.stop();
					} else if (interval) {
						clearInterval(interval);
					}
					activeIntervals.delete(messageId);
				}

				await prisma.guilds.update({
					where: { id: interaction.guildId },
					data: {
						automessage: {
							set: doc?.automessage.filter((msg) => msg.id !== messageId) || [],
						},
					},
				});

				interaction.reply({
					content: "Sucesso!",
					flags: "Ephemeral",
				});
				break;
			}
			case "list": {
				interaction.reply({
					content: `Aqui está a lista de mensagens que utilizam o sistema de autopublicar:\n\n${doc?.automessage
						.map((am) => {
							return `${am.id} | ${am.channel} | ${am.cronjob ? am.cronjob : formatLong(am.interval)}`;
						})
						.join("\n")}`,
					flags: "Ephemeral",
				});
				break;
			}
		}
	},
});
