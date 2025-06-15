import { createCommand } from "#base";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	AttachmentBuilder,
	PermissionFlagsBits,
	TextChannel,
} from "discord.js";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";

createCommand({
	name: "massban",
	nameLocalizations: { "pt-BR": "banir_em_massa" },
	description: "Realiza múltiplos banimentos no servidor ou em network.",
	defaultMemberPermissions: PermissionFlagsBits.BanMembers,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "ids",
			description: "Envie os IDs separados por espaços.",
			required: true,
			type: ApplicationCommandOptionType.String,
		},
		{
			type: ApplicationCommandOptionType.Integer,
			name: "severity",
			nameLocalizations: { "pt-BR": "gravidade" },
			required: true,
			description: "Qual gravidade? 1 ou 2?",
			maxValue: 2,
			minValue: 1,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "password",
			nameLocalizations: { "pt-BR": "senha" },
			required: true,
			description: "Qual a senha?",
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
		const gravidade = interaction.options.getInteger("severity") as number;
		const usuario = interaction.options
			.getString("ids")
			?.split(" ") as string[];
		const senha = interaction.options.getString("password") as string;
		const motivo =
			interaction.options.getString("reason") ?? "Sem motivo informado.";
		if (senha !== process.env.PASSWORD) {
			interaction.reply({ content: "A senha está errada." });
			return;
		}
		const reason = `Banido com The Reaper, por ${interaction.member.user.tag} foi definido como gravidade ${gravidade} - ${motivo}`;
		await interaction.deferReply({ flags: "Ephemeral" });
		if (gravidade === 1) {
			const guild = interaction.client.guilds.cache.get(interaction.guildId);
			usuario.forEach((banido) =>
				guild?.bans.create(banido, {
					reason,
					deleteMessageSeconds: 1 * 24 * 60 * 60,
				}),
			);
			interaction.editReply({
				content: "Banido com sucesso apenas neste servidor.",
			});
		}
		if (gravidade >= 2) {
			interaction.client.guilds.cache.forEach((a) => {
				if (a.id === "1132478504898920470") return;

				usuario.forEach((banido) =>
					a.bans
						.create(banido, { reason, deleteMessageSeconds: 1 * 24 * 60 * 60 })
						.catch((err) => {
							return err;
						}),
				);
			});
			interaction.editReply({
				content: `Banido com sucesso em ${interaction.client.guilds.cache.size} servidores.`,
			});
		}
		(<TextChannel>(
			interaction.client.channels.cache.get(settings.canais.logs)
		)).send({
			embeds: [
				createEmbed({
					color: settings.colors.default,
					title: "Banimento em massa - " + interaction.guild.name,
					fields: [
						{
							name: "<:Discord_Star:1038602481640407050> Moderador",
							value: `${interaction.member.user.tag} (${interaction.member.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Online:1035624222338334770> Gravidade",
							value: gravidade.toString(),
							inline: true,
						},
						{
							name: "<:Discord_Chat:1035624171960541244> Motivo",
							value: `\`${motivo}\``,
						},
					],
					image: "https://i.imgur.com/LdwPnzp.png",
					thumbnail: interaction.guild.iconURL(),
				}),
			],
			files: [
				new AttachmentBuilder(Buffer.from(usuario.join(" ")), {
					name: "reus.txt",
				}),
			],
		});
	},
});
