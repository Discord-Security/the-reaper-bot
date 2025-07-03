import type { InputJsonValue } from "@prisma/client/runtime/library";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	PermissionFlagsBits,
} from "discord.js";
import backup from "discord-rebackup";
import type { BackupData } from "discord-rebackup/lib/types/BackupData.js";
import { createCommand } from "#base";
import { prisma } from "#database";

createCommand({
	name: "backup",
	description: "Gerencie cópias de segurança do seu servidor.",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "create",
			nameLocalizations: {
				"pt-BR": "criar",
			},
			type: ApplicationCommandOptionType.Subcommand,
			description: "Crie uma cópia de segurança do seu servidor.",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "remove",
			nameLocalizations: { "pt-BR": "apagar" },
			description: "Apaga uma cópia de segurança do seu servidor.",
			options: [
				{
					name: "backup_id",
					description: "Informe o ID do seu Backup.",
					required: true,
					type: ApplicationCommandOptionType.String,
				},
				{
					name: "password",
					nameLocalizations: {
						"pt-BR": "senha",
					},
					type: ApplicationCommandOptionType.String,
					description: "Escreva a senha deste servidor.",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "load",
			nameLocalizations: { "pt-BR": "carregar" },
			description: "Carregue uma cópia de segurança do seu servidor.",
			options: [
				{
					name: "backup_id",
					description: "Informe o ID do seu Backup.",
					required: true,
					type: ApplicationCommandOptionType.String,
				},
				{
					name: "password",
					nameLocalizations: {
						"pt-BR": "senha",
					},
					type: ApplicationCommandOptionType.String,
					description: "Escreva a senha deste servidor.",
					required: true,
				},
			],
		},
	],
	async run(interaction) {
		const subcommand = interaction.options.getSubcommand(true);
		const senha = interaction.options.getString("password");
		const backupID = interaction.options.getString("backup_id");
		const doc = await prisma.guilds.findUnique({
			where: { id: interaction.guildId },
		});
		if (subcommand !== "create" && senha !== doc?.backup?.password) {
			interaction.reply({
				content: "A senha digitada está errada.",
				flags: "Ephemeral",
			});
			return;
		}
		switch (subcommand) {
			case "create": {
				interaction.deferReply({ flags: "Ephemeral" });
				backup
					.create(
						interaction.guild as unknown as Parameters<typeof backup.create>[0],
						{
							maxMessagesPerChannel: 30,
							jsonSave: true,
							jsonBeautify: true,
							saveImages: "base64",
							doNotBackup: ["emojis", "bans"],
						},
					)
					.then(async (backupData) => {
						let senhaGerada = null;
						if (
							doc?.backup?.password === undefined ||
							doc?.backup?.password === ""
						) {
							const ADJECTIVES = [
								"rápido",
								"lento",
								"grande",
								"pequeno",
								"forte",
								"fraco",
								"inteligente",
								"estranho",
								"brilhante",
								"escuro",
								"colorido",
								"transparente",
								"pesado",
								"leve",
								"quente",
								"frio",
								"doce",
								"amargo",
								"alto",
								"baixo",
								"macio",
								"duro",
								"molhado",
								"seco",
								"limpo",
								"sujo",
							];

							const NOUNS = [
								"cachorro",
								"gato",
								"elefante",
								"leão",
								"tigre",
								"urso",
								"pássaro",
								"peixe",
								"montanha",
								"rio",
								"oceano",
								"floresta",
								"deserto",
								"cidade",
								"edifício",
								"ponte",
								"computador",
								"telefone",
								"livro",
								"caneta",
								"cadeira",
								"mesa",
								"janela",
								"porta",
							];

							const VERBS = [
								"corre",
								"pula",
								"voa",
								"nada",
								"escala",
								"canta",
								"dança",
								"desenha",
								"escreve",
								"lê",
								"programa",
								"constrói",
								"destroi",
								"aprende",
								"ensina",
								"viaja",
							];

							const COLORS = [
								"vermelho",
								"azul",
								"verde",
								"amarelo",
								"roxo",
								"rosa",
								"laranja",
								"marrom",
								"preto",
								"branco",
								"cinza",
								"dourado",
								"prateado",
								"turquesa",
								"magenta",
								"ciano",
							];

							const adjective =
								ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
							const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
							const verb = VERBS[Math.floor(Math.random() * VERBS.length)];
							const color = COLORS[Math.floor(Math.random() * COLORS.length)];

							senhaGerada = `${adjective}${noun}${verb}${color}`;

							await prisma.guilds.update({
								where: { id: interaction.guildId },
								data: { backup: { password: senhaGerada } },
							});
						}
						await prisma.backupData.create({
							data: {
								id: backupData.id,
								rawData: backupData as unknown as InputJsonValue,
							},
						});

						interaction.editReply({
							content: `O seu backup foi concluído, porém guarde este código \`${backupData.id
								}\` para carregar o backup caso necessário. ${senhaGerada !== null
									? `\n\n\`Sua senha para todos os backups agora é: ${senhaGerada} \``
									: ""
								}`,
						});
					});
				break;
			}
			case "load": {
				const doc = await prisma.backupData.findUnique({
					where: { id: backupID as string },
				});
				if (doc) {
					backup.load(
						doc.rawData as unknown as BackupData,
						interaction.guild as unknown as Parameters<typeof backup.load>[1],
						{
							clearGuildBeforeRestore: true,
						},
					);
					interaction.reply({
						content: "Carregando o backup...",
						flags: "Ephemeral",
					});
				} else
					interaction.reply({
						content: "Falha ao carregar backup. Tente novamente mais tarde.",
						flags: "Ephemeral",
					});

				break;
			}
			case "remove": {
				prisma.backupData.delete({ where: { id: backupID as string } });
				interaction.reply({
					content: "Removido com sucesso!",
					flags: "Ephemeral",
				});
				break;
			}
		}
	},
});
