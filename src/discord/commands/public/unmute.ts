import { createCommand } from "#base";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	PermissionFlagsBits,
	TextChannel,
} from "discord.js";

createCommand({
	name: "unmute",
	nameLocalizations: { "pt-BR": "desmutar" },
	description: "Retire o castigo de um usuário.",
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
	],
	async run(interaction) {
		const member = interaction.options.getMember("user");
		const reason = "Removido por: " + interaction.member.user.tag;
		if (!member) {
			interaction.reply({
				content:
					"O membro que foi dado não é válido, você deve mencionar alguém dentro do servidor.",
			});
			return;
		}
		await member.timeout(null, reason).catch(() => {
			interaction.reply({
				content: "É impossível realizar tal ação contra este usuário.",
			});
			return;
		});

		(<TextChannel>(
			interaction.client.channels.cache.get(settings.canais.logs)
		)).send({
			embeds: [
				createEmbed({
					color: settings.colors.default,
					title: "Retiro do Silenciamento - " + interaction.guild.name,
					fields: [
						{
							name: "<:Discord_Star:1038602481640407050> Moderador",
							value: `${interaction.member.user.tag} (${interaction.member.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Danger:1028818835148656651> Réu",
							value: `${member.user.tag} (${member.id})`,
							inline: true,
						},
					],
					thumbnail: interaction.guild.iconURL(),
				}),
			],
		});
		interaction.reply({
			content: `Foi retirado o castigo a ${member}.`,
			flags: "Ephemeral",
		});
	},
});
