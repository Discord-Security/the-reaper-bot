import { createCommand } from "#base";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	Attachment,
	AttachmentBuilder,
	PermissionFlagsBits,
	TextChannel,
} from "discord.js";

createCommand({
	name: "proof",
	nameLocalizations: { "pt-BR": "prova" },
	description: "Envie provas para o servidor do The Reaper e sub-servidores.",
	defaultMemberPermissions: PermissionFlagsBits.KickMembers,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "ids",
			description: "Quais os IDs envolvidos?",
			required: true,
			type: ApplicationCommandOptionType.String,
		},
		{
			name: "reason",
			nameLocalizations: { "pt-BR": "motivo" },
			description: "Qual motivo?",
			required: true,
			type: ApplicationCommandOptionType.String,
		},
		{
			name: "image",
			nameLocalizations: { "pt-BR": "imagem" },
			description: "Quais são as provas?",
			required: true,
			type: ApplicationCommandOptionType.Attachment,
		},
	],
	async run(interaction) {
		const ids = interaction.options.getString("ids") as string;
		const motivo = interaction.options.getString("reason") as string;
		const imagem = interaction.options.getAttachment("image") as Attachment;

		interaction.reply({
			content:
				"Prova a ser processada para a host de imagem... em alguns instantes será enviado com sucesso.",
			flags: "Ephemeral",
		});

		(<TextChannel>(
			interaction.client.channels.cache.get("1028714676978208939")
		)).send({
			embeds: [
				createEmbed({
					color: settings.colors.default,
					title:
						"Caso Reaper #" + (Math.random() + 1).toString(36).substring(7),
					fields: [
						{
							name: "<:Discord_ID:1028818985942253578> ID's:",
							value: `> ${ids.split(" ").join("\n > ")}`,
							inline: true,
						},
						{
							name: "<:Discord_Staff:1028818928383836311> Staff",
							value: `> Tag: ${interaction.user.tag}\n> ID: ${interaction.user.id}`,
							inline: true,
						},
						{
							name: "<:Discord_Danger:1028818835148656651> Motivo",
							value: `\`${motivo}\``,
							inline: false,
						},
					],
					image: new AttachmentBuilder(imagem.proxyURL),
					footer: {
						text: interaction.guild.name,
						iconURL: interaction.guild.iconURL({
							size: 128,
						}),
					},
				}),
			],
		});
	},
});
