import { createCommand } from "#base";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	GuildMember,
	PermissionFlagsBits,
	TextChannel,
} from "discord.js";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";

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
		const user = interaction.options.getMember("user") as GuildMember;
		const reason =
			interaction.options.getString("reason") ?? "Sem motivo informado";
		if (
			interaction.member.roles.highest.position <= user.roles.highest.position
		) {
			interaction.reply({
				content: "O membro que você mencionou tem cargos mais altos que você.",
			});
			return;
		}
		if (!user.bannable || user.user.id === interaction.client.user.id) {
			interaction.reply({ content: "Não posso kickar esse membro." });
			return;
		}
		user.kick(`${reason} - Punido por: ${interaction.member.user.tag}`);
		interaction.reply({
			content: `${user.user.tag} foi kickado por ${reason} com sucesso.`,
			flags: "Ephemeral",
		});

		(<TextChannel>(
			interaction.client.channels.cache.get(settings.canais.logs)
		)).send({
			embeds: [
				createEmbed({
					color: settings.colors.default,
					title: "Expulsão - " + interaction.guild.name,
					fields: [
						{
							name: "<:Discord_Star:1038602481640407050> Moderador",
							value: `${interaction.member.user.tag} (${interaction.member.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Danger:1028818835148656651> Réu",
							value: `${user.user.tag} (${user.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Chat:1035624171960541244> Motivo",
							value: reason,
							inline: true,
						},
					],
					image: "https://i.imgur.com/aUuUubU.png",
				}),
			],
		});
	},
});
