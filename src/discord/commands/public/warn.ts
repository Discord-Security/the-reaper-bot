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
import { prisma } from "#database";

createCommand({
	name: "warn",
	nameLocalizations: { "pt-BR": "advertência" },
	description: "Informe um usuário da quebra de regras.",
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
		{
			type: ApplicationCommandOptionType.String,
			name: "reason",
			nameLocalizations: { "pt-BR": "motivo" },
			autocomplete: true,
			required: true,
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
		const membro = interaction.options.getMember("user") as GuildMember;
		const motivo = `${interaction.guild.name} - ${interaction.options.getString(
			"reason",
		)}`;
		if (membro.id === interaction.member.id) {
			interaction.reply({ content: "Sem brincar..." });
			return;
		}
		if (!membro) {
			interaction.reply({
				content: "Sup! Não foi encontrado um usuário dentro deste servidor.",
			});
			return;
		}

		const doc = await prisma.users.findUnique({ where: { id: membro.id } });

		(<TextChannel>(
			interaction.client.channels.cache.get(settings.canais.logs)
		)).send({
			embeds: [
				createEmbed({
					color: settings.colors.default,
					title: "Aviso - " + interaction.guild.name,
					fields: [
						{
							name: "<:Discord_Star:1038602481640407050> Moderador",
							value: `${interaction.member.user.tag} (${interaction.member.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Danger:1028818835148656651> Réu",
							value: `${membro.user.tag} (${membro.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Chat:1035624171960541244> Motivo",
							value: motivo,
							inline: true,
						},
					],
					thumbnail: interaction.guild.iconURL(),
				}),
			],
		});
		membro
			.send({
				content:
					"Você foi avisado por " +
					motivo +
					". Comporte-se para não receber mais punições desse tipo.",
			})
			.catch((err) => {
				if (err)
					interaction.channel?.send({
						content: `<@${membro.id}>, Você foi avisado por ${motivo}. Comporte-se para não receber mais punições desse tipo.`,
					});
			});

		interaction.reply({
			content: `Foi concedida uma mensagem no privado do usuário e guardado dentro do histórico - Esta é a ${doc ? doc.warns.length + 1 : 1
				}ª advertência do usuário.`,
			flags: "Ephemeral",
		});

		doc
			? prisma.users.update({
				where: { id: membro.id },
				data: { warns: { push: motivo } },
			})
			: prisma.users.create({ data: { id: membro.id, warns: [motivo] } });
	},
});
