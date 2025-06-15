import { createCommand } from "#base";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	PermissionFlagsBits,
	TextChannel,
	User,
} from "discord.js";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";

createCommand({
	name: "unban",
	nameLocalizations: { "pt-BR": "desbanir" },
	description: "Desbane um usuário do servidor ou da network.",
	defaultMemberPermissions: PermissionFlagsBits.BanMembers,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "user",
			nameLocalizations: { "pt-BR": "usuário" },
			description: "Qual usuário ou ID?",
			required: true,
			type: ApplicationCommandOptionType.User,
		},
		{
			name: "severity",
			nameLocalizations: {
				"pt-BR": "gravidade",
			},
			type: ApplicationCommandOptionType.Integer,
			description: "Gravidade 1 ou 2?",
			minValue: 1,
			maxValue: 2,
			required: true,
		},
	],
	async run(interaction) {
		const gravidade = interaction.options.getInteger("severity") as number;
		const usuario = interaction.options.getUser("user") as User;
		(<TextChannel>(
			interaction.client.channels.cache.get(settings.canais.logs)
		)).send({
			embeds: [
				createEmbed({
					color: settings.colors.default,
					title: "Desbanimento - " + interaction.guild.name,
					fields: [
						{
							name: "<:Discord_Star:1038602481640407050> Moderador",
							value: `${interaction.member.user.tag} (${interaction.member.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Danger:1028818835148656651> Réu",
							value: usuario.tag
								? `${usuario.tag} (${usuario.id})`
								: usuario.id,
							inline: true,
						},
						{
							name: "<:Discord_Online:1035624222338334770> Gravidade",
							value: gravidade.toString(),
							inline: true,
						},
					],
					thumbnail: interaction.guild.iconURL(),
					image: "https://i.imgur.com/n6kzJ4x.png",
				}),
			],
		});
		if (gravidade === 1) {
			await interaction.guild.members.unban(usuario).then(() =>
				interaction.reply({
					content: "Desbanido com sucesso apenas neste servidor.",
					flags: "Ephemeral",
				}),
			);
		}
		if (gravidade >= 2) {
			interaction.reply({
				content: `Desbanido com sucesso em ${interaction.client.guilds.cache.size} servidores.`,
				flags: "Ephemeral",
			});
			interaction.client.guilds.cache.forEach((guild) =>
				guild.members.unban(usuario).catch((err) => {
					if (err) return;
				}),
			);
		}
	},
});
