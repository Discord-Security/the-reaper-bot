import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	PermissionFlagsBits,
	type TextChannel,
} from "discord.js";
import { createCommand } from "#base";
import { prisma } from "#database";

createCommand({
	name: "logs",
	nameLocalizations: { "pt-BR": "registros" },
	description: "Define um canal de registros.",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "type",
			nameLocalizations: { "pt-BR": "tipo" },
			description: "Qual registro?",
			required: true,
			choices: [
				{
					name: "Mensagem Apagada",
					value: "deletedMessage",
				},
				{
					name: "Mensagem Editada",
					value: "editedMessage",
				},
				{
					name: "Entrada de Membro",
					value: "joinedMember",
				},
				{
					name: "Saída de Membro",
					value: "leftMember",
				},
				{ name: "Punições Reaper", value: "punishments" },
			],
		},
		{
			type: ApplicationCommandOptionType.Channel,
			name: "channel",
			nameLocalizations: { "pt-BR": "canal" },
			description: "Qual canal?",
			channelTypes: [ChannelType.GuildText],
			required: true,
		},
		{
			type: ApplicationCommandOptionType.Boolean,
			name: "activated",
			nameLocalizations: { "pt-BR": "ativado" },
			description: "Deve estar ligado ou desligado?",
			required: true,
		},
	],
	async run(interaction) {
		const logType = interaction.options.getString("type") as string;
		const targetChannel = interaction.options.getChannel(
			"channel",
		) as TextChannel;
		const isActivated = interaction.options.getBoolean("activated") as boolean;
		const replyMessage = `Log ${isActivated ? "ativado" : "desativado"} com sucesso.`;

		interaction.reply({ content: replyMessage });

		prisma.guilds.update({
			where: { id: interaction.guildId },
			data: { logs: { [logType]: isActivated ? targetChannel?.id : "" } },
		});
	},
});
