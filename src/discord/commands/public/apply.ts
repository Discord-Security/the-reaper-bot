import { createEmbed, createModalFields, createRow } from "@magicyan/discord";
import {
	ApplicationCommandType,
	ButtonBuilder,
	type GuildInvitableChannelResolvable,
	PermissionFlagsBits,
	type TextChannel,
	TextInputStyle,
} from "discord.js";
import { createCommand, createResponder, ResponderType } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";

createCommand({
	name: "apply",
	nameLocalizations: {
		"pt-BR": "candidatar",
	},
	description: "Candidate seu servidor á rede The Reaper.",
	defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
	type: ApplicationCommandType.ChatInput,
	async run(interaction) {
		if (interaction.guildId === "1025774982980186183")
			interaction.showModal({
				customId: "candidatar-reaper",
				title: "Formulário de candidatação",
				components: createModalFields({
					id: {
						label: "Qual o ID do seu servidor?",
						style: TextInputStyle.Paragraph,
						maxLength: 20,
						required: true,
					},
					function: {
						label: "Qual a sua função no servidor?",
						style: TextInputStyle.Paragraph,
						maxLength: 20,
						required: true,
					},
				}),
			});
		else {
			const guild = await prisma.guilds.findUnique({
				where: { id: interaction.guildId },
			});

			if (guild && guild.approved === true) {
				interaction.reply({
					content: "Este servidor já foi aprovado dentro da rede.",
					flags: "Ephemeral",
				});
				return;
			}
			interaction.showModal({
				customId: "candidatar",
				title: "Formulário de candidatação",
				components: createModalFields({
					age: {
						label: "Qual sua idade?",
						style: TextInputStyle.Short,
						maxLength: 2,
						minLength: 2,
						required: true,
					},
					reason: {
						label: "Porque você gostaria de se juntar?",
						style: TextInputStyle.Paragraph,
						maxLength: 512,
						required: true,
					},
				}),
			});
		}
	},
});

createResponder({
	customId: "candidatar-reaper",
	types: [ResponderType.Modal],
	cache: "cached",
	async run(interaction) {
		interaction.reply({
			content: "Sua candidatação foi enviada com sucesso e está em análise.",
			flags: "Ephemeral",
		});

		const { fields, member } = interaction;

		const id = fields.getTextInputValue("id");
		const funcao = fields.getTextInputValue("function");

		const server = interaction.client.guilds.cache.get(id);

		const strikes = [];

		if (!server || !server.name)
			strikes.push(
				`Não estou dentro do servidor que você mencionou, recomendo você me colocar no seu servidor para adiantar mais rápido o processo da sua aprovação.`,
			);

		if (strikes.length > 0) {
			interaction.channel?.send({
				content: `${interaction.member
					}, alguns dos meus sistemas apontaram que você inseriu alguns campos errados ou faltam ações externas a se fazer, das quais essas:\n\n* ${strikes.join(
						"\n* ",
					)}`,
			});
		}

		(<TextChannel>(
			interaction.client.channels.cache.get("1055621062836105236")
		)).send({
			embeds: [
				createEmbed({
					title: member.user.tag,
					fields: [
						{
							name: "👑 Solicitador:",
							value: `ID: ${member.id}\nTag: ${member.user.tag}\nFunção: ${funcao}`,
						},
						{
							name: "📜 Servidor:",
							value: `ID: ${id.toString()} Servidor: ${server ? server.name : "Desconhecido ou Fora de rede"
								}`,
						},
					],
					thumbnail: member.displayAvatarURL(),
					color: settings.colors.default,
				}),
			],
			components: [
				createRow(
					new ButtonBuilder()
						.setCustomId(`register/${member.id}/${id}`)
						.setLabel("Registrar")
						.setStyle(2)
						.setEmoji("1026116735759302727"),
				),
			],
		});
	},
});

createResponder({
	customId: "candidatar",
	types: [ResponderType.Modal],
	cache: "cached",
	async run(interaction) {
		const { fields, member, guild, channel } = interaction;
		const motivo = fields.getTextInputValue("reason");
		const idade = parseInt(fields.getTextInputValue("age"));

		if (!Number.isNaN(idade) && idade < 13) {
			interaction.reply({
				content:
					"Você não pode acessar nossa rede devido à idade insuficiente exigida pelo Discord, o que violaria os Termos de Serviço da plataforma.",
				flags: "Ephemeral",
			});
			return;
		}

		interaction.reply({
			content: "Sua candidatação foi enviada com sucesso e está em análise.",
			flags: "Ephemeral",
		});

		const invite = await guild.invites.create(
			channel as GuildInvitableChannelResolvable,
			{
				maxAge: 0,
				maxUses: 0,
			},
		);

		(<TextChannel>(
			interaction.client.channels.cache.get("1050494003155570708")
		)).send({
			content: "@everyone",
			embeds: [
				createEmbed({
					title: guild.name,
					fields: [
						{
							name: "👑 Solicitador:",
							value: `ID: ${member.id}\nTag: ${member.user.tag}\nIdade: ${idade}\nMotivo: ${motivo}`,
						},
						{
							name: "📜 Servidor:",
							value: `ID: ${guild.id.toString()}\nDono: ${guild.ownerId
								}\nMembros: ${guild.memberCount}`,
						},
						{
							name: "📨 Convite:",
							value: invite.url,
						},
					],
					thumbnail: interaction.guild.iconURL(),
					color: settings.colors.default,
				}),
			],
			components: [
				createRow(
					new ButtonBuilder()
						.setCustomId(`approve/${guild.id}`)
						.setLabel("Aprovar")
						.setStyle(2)
						.setEmoji("1026116735759302727"),
					new ButtonBuilder()
						.setCustomId(`reject/${guild.id}`)
						.setLabel("Rejeitar")
						.setStyle(2)
						.setEmoji("1026116707770712136"),
				),
			],
		});
	},
});
