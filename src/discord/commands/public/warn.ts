import { createEmbed } from "@magicyan/discord";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type GuildMember,
	PermissionFlagsBits,
	type TextChannel,
} from "discord.js";
import { createCommand } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";

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
		const targetMember = interaction.options.getMember("user") as GuildMember;
		const reasonText = `${interaction.guild.name} - ${interaction.options.getString(
			"reason",
		)}`;
		if (targetMember.id === interaction.member.id) {
			interaction.reply({ content: "Sem brincar..." });
			return;
		}
		if (!targetMember) {
			interaction.reply({
				content: "Sup! Não foi encontrado um usuário dentro deste servidor.",
			});
			return;
		}

		const userData = await prisma.users.findUnique({
			where: { id: targetMember.id },
		});

		(<TextChannel>(
			interaction.client.channels.cache.get(settings.canais.logs)
		)).send({
			embeds: [
				createEmbed({
					color: settings.colors.default,
					title: `Aviso - ${interaction.guild.name}`,
					fields: [
						{
							name: "<:Discord_Star:1038602481640407050> Moderador",
							value: `${interaction.member.user.tag} (${interaction.member.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Danger:1028818835148656651> Réu",
							value: `${targetMember.user.tag} (${targetMember.id})`,
							inline: true,
						},
						{
							name: "<:Discord_Chat:1035624171960541244> Motivo",
							value: reasonText,
							inline: true,
						},
					],
					thumbnail: interaction.guild.iconURL(),
				}),
			],
		});
		targetMember
			.send({
				content:
					"Você foi avisado por " +
					reasonText +
					". Comporte-se para não receber mais punições desse tipo.",
			})
			.catch((err) => {
				if (err)
					interaction.channel?.send({
						content: `<@${targetMember.id}>, Você foi avisado por ${reasonText}. Comporte-se para não receber mais punições desse tipo.`,
					});
			});

		interaction.reply({
			content: `Foi concedida uma mensagem no privado do usuário e guardado dentro do histórico - Esta é a ${
				userData ? userData.warns.length + 1 : 1
			}ª advertência do usuário.`,
			flags: "Ephemeral",
		});

		userData
			? prisma.users.update({
					where: { id: targetMember.id },
					data: { warns: { push: reasonText } },
				})
			: prisma.users.create({
					data: { id: targetMember.id, warns: [reasonText] },
				});
	},
});
