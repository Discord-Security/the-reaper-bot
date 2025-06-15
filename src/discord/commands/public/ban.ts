import { createCommand } from "#base";
import { prisma } from "#database";
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
	name: "ban",
	nameLocalizations: { "pt-BR": "banir" },
	description: "Bane um usuário do servidor ou da network.",
	defaultMemberPermissions: PermissionFlagsBits.BanMembers,
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
		const usuario = interaction.options.getUser("user") as User;
		const motivo =
			interaction.options.getString("reason") ?? "Sem motivo informado.";
		if (usuario.bot || usuario.id === interaction.member.user.id) {
			interaction.reply({
				content: "Não se pode banir bots oficiais ou a si mesmo.",
			});
			return;
		}
		const reason = `Banido com The Reaper, por ${interaction.member.user.tag} foi definido como gravidade ${gravidade} - ${motivo}`;
		if (gravidade === 1) {
			if (interaction.guildId === "856873114926972929")
				usuario
					.send({
						content:
							'Você foi **banido** do servidor For You. Mas não se preocupe! Você ainda tem a chance de apelar o banimento. Acesse o **Tribunal da Discord Security**, utilizando o último link do meu sobre mim. Certifique-se de selecionar a opção "For You" no botão para fazer sua apelação. Boa sorte! 🚀',
					})
					.catch(() => {
						return;
					});
			interaction.guild.bans
				.create(usuario.id, {
					reason,
					deleteMessageSeconds: 1 * 24 * 60 * 60,
				})
				.catch((err) => {
					interaction.channel?.send(`Erro: ${err}`);
				});
			interaction.reply({
				content: "Banido com sucesso apenas neste servidor.",
				flags: "Ephemeral",
			});
		}
		if (gravidade >= 2) {
			usuario
				.send({
					content:
						'Você foi **banido** de **todos os servidores da rede The Reaper**. Mas não se preocupe! Você sempre tem o direito de apelar o banimento. Basta acessar o **Tribunal da Discord Security**, utilizando o último link do meu sobre mim. Certifique-se de selecionar a opção "The Reaper" no botão para fazer sua apelação. Boa sorte! 🚀',
				})
				.catch(() => {
					return 0;
				});
			interaction.client.guilds.cache.forEach((a) => {
				if (a.id === "1132478504898920470") return;

				a.bans
					.create(usuario.id, {
						reason,
						deleteMessageSeconds: 1 * 24 * 60 * 60,
					})
					.catch(async (err) => {
						if (err.code === 10013) {
							interaction.channel?.send(
								"Este é um usuário desconhecido para a API do Discord, veja se não falhou algo.",
							);
						}

						if (err.code === 50013) {
							const Guilds = await prisma.guilds.findUnique({
								where: { id: a.id },
							});
							const mention =
								Guilds?.roleId !== undefined ? "&" + Guilds.roleId : a.ownerId;
							(<TextChannel>(
								interaction.client.channels.cache.get(settings.canais.strikes)
							)).send({
								content: `<@${mention}>, seu servidor ${a.name} me rejeitou o uso de permissões administrativas, por favor re-coloque a permissão administrativa imediatamente, se você ama ter um servidor seguro.`,
							});
						}
					});
			});
			interaction.reply({
				content: `Banido com sucesso em ${interaction.client.guilds.cache.size} servidores.`,
				flags: "Ephemeral",
			});
		}
		(<TextChannel>(
			interaction.client.channels.cache.get(settings.canais.logs)
		)).send({
			embeds: [
				createEmbed({
					color: settings.colors.default,
					title: "Banimento - " + interaction.guild.name,
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
						{
							name: "<:Discord_Chat:1035624171960541244> Motivo",
							value: `\`${motivo}\``,
						},
					],
					image: "https://i.imgur.com/MyYtFil.png",
					thumbnail: interaction.guild.iconURL(),
				}),
			],
		});
	},
});
