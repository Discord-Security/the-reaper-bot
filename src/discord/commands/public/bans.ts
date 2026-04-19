import { createEmbed } from "@magicyan/discord";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	AttachmentBuilder,
	type GuildBan,
	PermissionFlagsBits,
} from "discord.js";
import { createCommand } from "#base";
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
				const banIdList = await (async (
					accumulator: string[] = [],
					last = "0",
					limit = 1000,
				) => {
					while (limit === 1000) {
						const bans = await interaction.guild.bans.fetch({
							after: last,
							limit: limit,
						});
						const banIds = bans.map((user) => user.user.id);

						last = (<GuildBan>bans.last()).user.id;
						limit = banIds.length;

						for (let i = 0; i < limit; i++) {
							accumulator.push(banIds[i]);
						}
					}

					return accumulator;
				})();

				const banIdObject = ((o: { [key: string]: number } = {}) => {
					for (let i = 0; i < banIdList.length; i++) {
						o[banIdList[i]] = 1;
					}

					return o;
				})();

				await interaction.reply({
					content: `**${banIdList.length} usuários foram banidos do seu servidor:**`,
					files: [
						new AttachmentBuilder(
							Buffer.from(Object.keys(banIdObject).join("\n")),
							{
								name: "bansExport.txt",
							},
						),
					],
				});
				break;
			}
			case "search": {
				const reasonText = interaction.options.getString("reason") as string;
				const banIdList = await (async (
					accumulator: string[] = [],
					last = "0",
					limit = 1000,
				) => {
					while (limit === 1000) {
						const bans = await interaction.guild.bans.fetch({
							after: last.toString(),
							limit,
						});
						const banIds = bans.map((user) => user.user.id);

						last = (<GuildBan>bans.last()).user.id;
						limit = banIds.length;

						for (let i = 0; i < limit; i++) {
							accumulator.push(banIds[i]);
						}
					}

					return accumulator;
				})();

				const bannedUsers = [];
				for (let i = 0; i < banIdList.length; i++) {
					const banInfo = await interaction.guild.bans.fetch(banIdList[i]);
					if (banInfo.reason?.includes(reasonText)) {
						bannedUsers.push(banInfo);
					}
				}

				if (bannedUsers.length === 0) {
					interaction.reply({
						content: "Não encontrei nenhum dado para o motivo filtrado.",
					});
					return;
				}

				if (bannedUsers.length <= 7) {
					interaction.reply({
						content: `No total são ${bannedUsers.length} banidos pelo motivo filtrado:`,
						embeds: [
							createEmbed({
								timestamp: new Date(),
								title: `Banimentos filtrados por: ${reasonText}`,
								color: settings.colors.default,
								description: `Tag - ID - Motivo\n\n${bannedUsers
									.map(
										(b) =>
											`${b.user.tag} - ${b.user.id} - ${
												b.reason
													?.replace(reasonText, `**${reasonText}**`)
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
					content: `No total são ${bannedUsers.length} banidos pelo motivo filtrado:`,
					files: [
						new AttachmentBuilder(
							Buffer.from(
								bannedUsers
									.map(
										(b) =>
											`${b.user.tag} - ${b.user.id} - ${b.reason
												?.replace(reasonText, `**${reasonText}**`)
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
