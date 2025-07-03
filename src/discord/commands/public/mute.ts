import { parse } from "@lukeed/ms";
import { createEmbed } from "@magicyan/discord";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type GuildMember,
	PermissionFlagsBits,
	type TextChannel,
} from "discord.js";
import { createCommand } from "#base";
import { formatLong } from "#functions";
import { settings } from "#settings";

createCommand({
	name: "mute",
	nameLocalizations: { "pt-BR": "silenciar" },
	description: "Silencie um usuário do servidor.",
	defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "user",
			nameLocalizations: { "pt-BR": "usuário" },
			description: "Qual usuário?",
			required: true,
			type: ApplicationCommandOptionType.User,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "time",
			nameLocalizations: { "pt-BR": "tempo" },
			required: true,
			description: "Quanto tempo? (Ex: 1d, 1h, 1m)",
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "reason",
			nameLocalizations: { "pt-BR": "motivo" },
			autocomplete: true,
			description: "Qual motivo?",
		},
	],
	autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();
		const filtered = settings.reasons.filter((choice) =>
			choice.toLowerCase().includes(focusedValue.toLowerCase()),
		);
		return interaction.respond(
			filtered.map((choice) => ({ name: choice, value: choice })),
		);
	},
	async run(interaction) {
		const member = interaction.options.getMember("user") as GuildMember;
		const reason =
			interaction.options.getString("reason") ??
			`Sem motivo definido. - Punido por: ${interaction.member.user.tag}`;
		const time = parse(interaction.options.getString("time") as string);

		if (!time) {
			interaction.reply({
				content:
					"O tempo que foi dado não é válido. Você deve usar d para dias, h para horas e m para minutos.",
			});
			return;
		}
		if (
			!member ||
			member.user.bot ||
			member.id === interaction.member.user.id
		) {
			interaction.reply({
				content: "Não se pode banir bots oficiais ou a si mesmo.",
			});
			return;
		}
		await member.timeout(time, reason).catch((error) => {
			if (error) {
				interaction.reply({
					content: "É impossível realizar tal ação contra este usuário.",
				});
				return;
			}
		});
		(<TextChannel>(
			interaction.client.channels.cache.get(settings.canais.logs)
		)).send({
			embeds: [
				createEmbed({
					color: settings.colors.default,
					title: `Silenciamento - ${interaction.guild.name}`,
					fields: [
						{
							name: "<:Discord_Star:1038602481640407050> Moderador",
							value: `${interaction.member.user.tag} (${interaction.member.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Danger:1028818835148656651> Réu",
							value: `${member.user.tag} (${member.user.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Chat:1035624171960541244> Motivo",
							value: reason,
							inline: true,
						},
						{
							name: "<:Discord_Info:1036702634603728966> Tempo",
							value: (await formatLong(time)).toString(),
							inline: true,
						},
					],
					image: "https://i.imgur.com/R997gVO.png",
					thumbnail: interaction.guild.iconURL(),
				}),
			],
		});
		interaction.reply({
			content: `${member} foi mutado por ${formatLong(time)}`,
			flags: "Ephemeral",
		});
	},
});
