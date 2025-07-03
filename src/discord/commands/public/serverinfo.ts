import { createEmbed } from "@magicyan/discord";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
} from "discord.js";
import { createCommand } from "#base";
import { settings } from "#settings";

createCommand({
	name: "serverinfo",
	nameLocalizations: { "pt-BR": "servidor_info" },
	description: "Saiba algumas informações sobre o servidor.",
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "id_server",
			nameLocalizations: {
				"pt-BR": "id_servidor",
			},
			description: "Identifique o ID do servidor",
			autocomplete: true,
		},
	],
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		const choices = await Promise.all(
			interaction.client.guilds.cache
				.filter((sv) => sv.id.includes(focusedValue.value))
				.map(async (choice) => ({
					name: await interaction.client.guilds
						.fetch(choice.id)
						.then((guild) => guild.name.slice(0, 25)),
					value: choice.id,
				})),
		);
		await interaction.respond(choices.slice(0, 25));
	},
	async run(interaction) {
		const guild = interaction.client.guilds.cache.get(
			interaction.options.getString("id_server") || interaction.guildId,
		);

		if (!guild) {
			interaction.reply({ content: "Servidor não encontrado." });
			return;
		}

		interaction.reply({
			embeds: [
				createEmbed({
					color: settings.colors.default,
					title: guild.name,
					thumbnail: guild.iconURL({ size: 512 }),
					fields: [
						{
							name: "<:Discord_Owner:1120112684038365214> Dono",
							value: `<@${guild.ownerId}> (${guild.ownerId})`,
							inline: true,
						},
						{
							name: "<:Discord_Staff:1028818928383836311> Membros Totais",
							value: `${guild.memberCount}`,
							inline: true,
						},
						{
							name: "<:Discord_Integration:1120112458166710302> Contagem de Usuários / Bots",
							value: `${guild.members.cache.filter((member) => !member.user.bot).size
								} / ${guild.members.cache.filter((member) => member.user.bot).size}`,
							inline: true,
						},
						{
							name: "<:Discord_Channel:1035624104264470648> Canais de Texto / Voz",
							value: `${guild.channels.cache.filter(
								(channels) => channels.type === ChannelType.GuildText,
							).size
								} / ${guild.channels.cache.filter(
									(c) => c.type === ChannelType.GuildVoice,
								).size
								}`,
							inline: true,
						},
						{
							name: "<:Discord_Role:1041100114762149958> Cargos",
							value: `${guild.roles.cache.size}`,
							inline: true,
						},
					],
				}),
			],
		});
	},
});
