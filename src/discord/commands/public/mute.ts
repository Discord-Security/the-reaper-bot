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
		const targetMember = interaction.options.getMember("user") as GuildMember;
		const reasonText =
			interaction.options.getString("reason") ??
			`Sem motivo definido. - Punido por: ${interaction.member.user.tag}`;
		const timeAmount = parse(interaction.options.getString("time") as string);

		if (!timeAmount) {
			interaction.reply({
				content:
					"O tempo que foi dado não é válido. Você deve usar d para dias, h para horas e m para minutos.",
			});
			return;
		}
		if (
			!targetMember ||
			targetMember.user.bot ||
			targetMember.id === interaction.member.user.id
		) {
			interaction.reply({
				content: "Não se pode banir bots oficiais ou a si mesmo.",
			});
			return;
		}
		await targetMember.timeout(timeAmount, reasonText).catch((error) => {
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
							value: `${targetMember.user.tag} (${targetMember.user.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Chat:1035624171960541244> Motivo",
							value: reasonText,
							inline: true,
						},
						{
							name: "<:Discord_Info:1036702634603728966> Tempo",
							value: (await formatLong(timeAmount)).toString(),
							inline: true,
						},
					],
					image: "https://i.imgur.com/R997gVO.png",
					thumbnail: interaction.guild.iconURL(),
				}),
			],
		});
		interaction.reply({
			content: `${targetMember} foi mutado por ${(await formatLong(timeAmount))}`,
			flags: "Ephemeral",
		});
	},
});
