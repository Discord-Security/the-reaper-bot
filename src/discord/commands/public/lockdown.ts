import { parse } from "@lukeed/ms";
import { createEmbed } from "@magicyan/discord";
import { CronJob } from "cron";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	type ChatInputCommandInteraction,
	PermissionFlagsBits,
	type TextChannel,
} from "discord.js";
import { createCommand } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";

/**
 * Ativa o modo lockdown no servidor
 * @param guildId ID da guild
 * @param reason Motivo do lockdown
 * @param interaction Interação
 * @param time Tempo de duração (opcional)
 */
async function activateLockdown(
	guildId: string,
	interaction: ChatInputCommandInteraction,
	reason?: string,
	time?: string,
) {
	const guild = await prisma.guilds.findUnique({ where: { id: guildId } });
	if (!guild) return;

	const channels = interaction.guild?.channels.cache
		.filter((channel) => channel.type === ChannelType.GuildText)
		.filter((channel) =>
			channel.permissionsFor(guildId)?.has(PermissionFlagsBits.ViewChannel),
		);

	// Aplica o lockdown em todos os canais
	channels?.forEach((channel) => {
		if (
			channel.permissionsFor(guildId)?.has(PermissionFlagsBits.SendMessages)
		) {
			if (reason) {
				(channel as TextChannel).send({
					embeds: [
						createEmbed({
							color: settings.colors.default,
							title: "Lockdown no servidor globalmente!",
							description: reason,
							thumbnail: "https://i.imgur.com/UhN88X9.png",
						}),
					],
				});
			}

			channel.permissionOverwrites.set(
				[{ id: guildId, deny: [PermissionFlagsBits.SendMessages] }],
				"Modo Lockdown ativado",
			);

			if (!guild.channelsLockdown.includes(channel.id)) {
				prisma.guilds.update({
					where: { id: guildId },
					data: {
						channelsLockdown: { push: channel.id },
					},
				});
			}
		}
	});

	// Configura o tempo de lockdown se especificado
	if (time) {
		const endTime = new Date(Date.now() + <number>parse(time));
		await prisma.guilds.update({
			where: { id: guildId },
			data: {
				lockdownTime: endTime,
			},
		});

		new CronJob(
			endTime,
			() => deactivateLockdown(guildId, interaction),
			null,
			true,
		);
	}

	await prisma.guilds.update({
		where: { id: guildId },
		data: {
			channelsLockdown: guild.channelsLockdown,
			lockdownTime: guild.lockdownTime,
		},
	});
}

/**
 * Desativa o modo lockdown no servidor
 * @param guildId ID da guild
 * @param interaction Interação
 */
async function deactivateLockdown(
	guildId: string,
	interaction: ChatInputCommandInteraction,
) {
	const guild = await prisma.guilds.findUnique({ where: { id: guildId } });
	if (!guild) return;

	const channels = interaction.guild?.channels.cache.filter(
		(channel) => channel.type === ChannelType.GuildText,
	);

	// Remove o lockdown de todos os canais
	channels?.forEach((channel) => {
		if (guild.channelsLockdown.includes(channel.id)) {
			channel.permissionOverwrites.set(
				[{ id: guildId, allow: [PermissionFlagsBits.SendMessages] }],
				"Modo Lockdown desativado",
			);
		}
	});

	// Limpa os dados do lockdown
	await prisma.guilds.update({
		where: { id: guildId },
		data: {
			channelsLockdown: [],
			lockdownTime: null,
		},
	});
}

createCommand({
	name: "lockdown",
	nameLocalizations: { "pt-BR": "bloquear_servidor" },
	description: "Bloqueie um servidor inteiro.",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "activate",
			nameLocalizations: { "pt-BR": "ativar" },
			description: "Ative o sistema.",
			options: [
				{
					name: "reason",
					nameLocalizations: { "pt-BR": "motivo" },
					type: ApplicationCommandOptionType.String,
					description: "Qual motivo?",
				},
				{
					name: "time",
					nameLocalizations: { "pt-BR": "tempo" },
					type: ApplicationCommandOptionType.String,
					description: "Quanto tempo? (Ex: 1h 30m)",
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "desactivate",
			nameLocalizations: { "pt-BR": "desativar" },
			description: "Desative o sistema.",
		},
	],
	async run(interaction) {
		const subcommand = interaction.options.getSubcommand(true);

		try {
			switch (subcommand) {
				case "activate": {
					const reason = interaction.options.getString("reason") as
						| string
						| undefined;
					const time = interaction.options.getString("time") as
						| string
						| undefined;
					await activateLockdown(
						interaction.guildId,
						interaction,
						reason,
						time,
					);
					await interaction.reply({
						content: `Sucesso, todo o servidor foi bloqueado! Utilize **/lockdown desativar** para abrir novamente o servidor.`,
					});
					break;
				}

				case "desactivate":
					await deactivateLockdown(interaction.guildId, interaction);
					await interaction.reply({
						content: `Sucesso, todo o servidor foi desbloqueado!`,
					});
					break;
			}
		} catch (_err) {
			await interaction.reply({
				content: "Ocorreu um erro ao executar este comando.",
				flags: "Ephemeral",
			});
		}
	},
});
