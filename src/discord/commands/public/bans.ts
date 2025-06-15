import { createCommand } from "#base";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	AttachmentBuilder,
	GuildBan,
	PermissionFlagsBits,
} from "discord.js";
import { createEmbed } from "@magicyan/discord";
import { settings } from "#settings";

createCommand({
	name: "bans",
	description: "Categoria dos bans.",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "info",
			type: ApplicationCommandOptionType.Subcommand,
			description: "Obtenha informação de um banimento.",
			options: [
				{
					name: "id",
					description: "Informe o ID de um usuário.",
					required: true,
					type: ApplicationCommandOptionType.String,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "search",
			nameLocalizations: { "pt-BR": "pesquisar" },
			description: "Pesquise banimentos por motivos.",
			options: [
				{
					name: "reason",
					nameLocalizations: {
						"pt-BR": "motivo",
					},
					type: ApplicationCommandOptionType.String,
					description: "Qual o motivo de banimento que você procura?",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "export",
			nameLocalizations: { "pt-BR": "exportar" },
			description: "Exporte todos os ID's que foram banidos em seu servidor.",
		},
	],
	async run(interaction) {
		switch (interaction.options.getSubcommand(true)) {
			case "info": {
				const id = interaction.options.getString("id") as string;
				const banInfo = await interaction.guild.bans.fetch(id).catch(() => {
					interaction.reply("Não foi encontrado um banimento nesse usuário.");
				});

				interaction.reply({
					embeds: [
						createEmbed({
							timestamp: new Date(),
							color: settings.colors.default,
							thumbnail: "https://i.imgur.com/UqfCDzg.jpeg",
							title: "Informações do Banimento",
							fields: [
								{
									name: `<:Discord_Danger:1028818835148656651> Usuário:`,
									value: `\`${banInfo?.user.tag}\``,
								},
								{
									name: `<:Discord_ID:1028818985942253578> ID do Usuário:`,
									value: `\`${banInfo?.user.id}\``,
								},
								{
									name: `<:Discord_Chat:1035624171960541244> Motivo do Banimento:`,
									value: `\`${banInfo?.reason || "Sem motivo informado."}\``,
								},
							],
						}),
					],
				});
				break;
			}
			case "export": {
				const completeBanIdList = await (async (
					a: string[] = [],
					last = "0",
					limit = 1000,
				) => {
					while (limit === 1000) {
						const bans = await interaction.guild.bans.fetch({
							after: last,
							limit: limit,
						});
						const banlist = bans.map((user) => user.user.id);

						last = (<GuildBan>bans.last()).user.id;
						limit = banlist.length;

						for (let i = 0; i < limit; i++) {
							a.push(banlist[i]);
						}
					}

					return a;
				})();

				const banIdObj = ((o: { [key: string]: number } = {}) => {
					for (let i = 0; i < completeBanIdList.length; i++) {
						o[completeBanIdList[i]] = 1;
					}

					return o;
				})();

				await interaction.reply({
					content: `**${completeBanIdList.length} usuários foram banidos do seu servidor:**`,
					files: [
						new AttachmentBuilder(
							Buffer.from(Object.keys(banIdObj).join("\n")),
							{
								name: "bansExport.txt",
							},
						),
					],
				});
				break;
			}
			case "search": {
				const motivo = interaction.options.getString("reason") as string;
				const completeBanIdList = await (async (
					a: string[] = [],
					last = "0",
					limit = 1000,
				) => {
					while (limit === 1000) {
						const bans = await interaction.guild.bans.fetch({
							after: last.toString(),
							limit,
						});
						const banlist = bans.map((user) => user.user.id);

						last = (<GuildBan>bans.last()).user.id;
						limit = banlist.length;

						for (let i = 0; i < limit; i++) {
							a.push(banlist[i]);
						}
					}

					return a;
				})();

				const bans = [];
				for (let i = 0; i < completeBanIdList.length; i++) {
					const banInfo = await interaction.guild.bans.fetch(
						completeBanIdList[i],
					);
					if (banInfo.reason && banInfo.reason.includes(motivo)) {
						bans.push(banInfo);
					}
				}

				if (bans.length === 0) {
					interaction.reply({
						content: "Não encontrei nenhum dado para o motivo filtrado.",
					});
					return;
				}

				if (bans.length <= 7) {
					interaction.reply({
						content: `No total são ${bans.length} banidos pelo motivo filtrado:`,
						embeds: [
							createEmbed({
								timestamp: new Date(),
								title: "Banimentos filtrados por: " + motivo,
								color: settings.colors.default,
								description: `Tag - ID - Motivo\n\n${bans
									.map(
										(b) =>
											`${b.user.tag} - ${b.user.id} - ${
												b.reason
													?.replace(motivo, "**" + motivo + "**")
													.replace(
														/Banido com The Reaper[\s\S]*?gravidade\s*([1-2]) - /gm,
														"",
													) || "Sem motivo fornecido"
											}`,
									)
									.join("\n")}`,
							}),
						],
					});
					return;
				}
				interaction.reply({
					content: `No total são ${bans.length} banidos pelo motivo filtrado:`,
					files: [
						new AttachmentBuilder(
							Buffer.from(
								bans
									.map(
										(b) =>
											`${b.user.tag} - ${b.user.id} - ${b.reason
												?.replace(motivo, "**" + motivo + "**")
												.replace(
													/Banido com The Reaper[\s\S]*?gravidade\s*([1-2]) - /gm,
													"",
												)}`,
									)
									.join("\n"),
							),
							{
								name: "bansSearch.txt",
							},
						),
					],
				});
			}
		}
	},
});
