import { createEmbed } from "@magicyan/discord";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type GuildMember,
	PermissionFlagsBits,
	type TextChannel,
} from "discord.js";
import { createCommand } from "#base";
import { settings } from "#settings";

createCommand({
	name: "kick",
	nameLocalizations: { "pt-BR": "expulsar" },
	description: "Expulsa um usuário do servidor.",
	defaultMemberPermissions: PermissionFlagsBits.KickMembers,
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
			interaction.options.getString("reason") ?? "Sem motivo informado";
		if (
			interaction.member.roles.highest.position <=
			targetMember.roles.highest.position
		) {
			interaction.reply({
				content: "O membro que você mencionou tem cargos mais altos que você.",
			});
			return;
		}
		if (
			!targetMember.bannable ||
			targetMember.user.id === interaction.client.user.id
		) {
			interaction.reply({ content: "Não posso kickar esse membro." });
			return;
		}
		targetMember.kick(
			`${reasonText} - Punido por: ${interaction.member.user.tag}`,
		);
		interaction.reply({
			content: `${targetMember.user.tag} foi kickado por ${reasonText} com sucesso.`,
			flags: "Ephemeral",
		});

		(<TextChannel>(
			interaction.client.channels.cache.get(settings.canais.logs)
		)).send({
			embeds: [
				createEmbed({
					color: settings.colors.default,
					title: `Expulsão - ${interaction.guild.name}`,
					fields: [
						{
							name: "<:Discord_Star:1038602481640407050> Moderador",
							value: `${interaction.member.user.tag} (${interaction.member.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Danger:1028818835148656651> Réu",
							value: `${targetMember.user.tag} (${targetMember.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Chat:1035624171960541244> Motivo",
							value: reasonText,
							inline: true,
						},
					],
					image: "https://i.imgur.com/aUuUubU.png",
				}),
			],
		});
	},
});
