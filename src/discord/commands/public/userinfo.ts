import { createCommand } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";
import { createEmbed, createRow } from "@magicyan/discord";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonBuilder,
	ComponentType,
	time,
} from "discord.js";
import axios from "axios";

createCommand({
	name: "userinfo",
	nameLocalizations: { "pt-BR": "info_usuário" },
	description: "Veja informações úteis sobre o usuário.",
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "user",
			nameLocalizations: { "pt-BR": "usuário" },
			description: "Qual usuário?",
			required: true,
			type: ApplicationCommandOptionType.User,
		},
	],
	async run(interaction) {
		const membro = interaction.options.getMember("user");
		if (!membro) {
			interaction.reply({
				content: "Sup! Não foi encontrado um usuário dentro deste servidor.",
			});
			return;
		}

		const doc = await prisma.users.findUnique({
			where: { id: membro.id },
			select: { warns: true },
		});

		const embed = createEmbed({
			title: membro.user.tag,
			fields: [
				{
					name: "<:Discord_ID:1028818985942253578> ID:",
					value: membro.user.id,
					inline: true,
				},
				{
					name: "<:Discord_Join:1041100297629597836> Criada em: ",
					value: `${time(membro.user.createdAt, "f")} (${time(
						membro.user.createdAt,
						"R",
					)})`,
					inline: true,
				},
				{
					name: "<:exit:1039949967772622948> Entrou em: ",
					value: membro.joinedTimestamp
						? `${time(Math.floor(membro.joinedTimestamp / 1000), "f")} (${time(
								Math.floor(membro.joinedTimestamp / 1000),
								"R",
							)})`
						: "Não está dentro do servidor.",
					inline: true,
				},
				{
					name: "<:Discord_Danger:1028818835148656651> Histórico de avisos:",
					value:
						doc && doc.warns
							? `\`\`\`${doc.warns.join("\n")}\`\`\``
							: "Sem avisos",
				},
			],
			thumbnail: membro.user.displayAvatarURL({ extension: "png" }),
			color: settings.colors.default,
		});
		const mensagem = await interaction.reply({
			embeds: [embed],
			components: [
				createRow(
					new ButtonBuilder()
						.setCustomId("info")
						.setLabel("Informação")
						.setEmoji("1036702634603728966")
						.setStyle(2),
					new ButtonBuilder()
						.setCustomId("guilds")
						.setLabel("Servidores mútuos")
						.setEmoji("1028818928383836311")
						.setStyle(2),
					new ButtonBuilder()
						.setCustomId("roles")
						.setLabel("Cargos")
						.setEmoji("1041100114762149958")
						.setStyle(2),
				),
			],
		});
		const filter = (i: { user: { id: string } }) =>
			interaction.user.id === i.user.id;
		const collector = mensagem.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter,
			time: 300000,
		});

		collector.on("collect", async (i) => {
			i.deferUpdate();
			if (i.customId === "info") interaction.editReply({ embeds: [embed] });

			if (i.customId === "guilds") {
				const { data } = await axios.get(
					`https://floppapower.perfectdreams.net/api/v1/users/${membro.user.id}/guilds`,
				);
				interaction.editReply({
					embeds: [
						createEmbed({
							color: settings.colors.default,
							thumbnail: membro.user.displayAvatarURL({ extension: "png" }),
							title: membro.user.tag,
							description: `Servidores da Rede The Reaper mútuos:\n\n${interaction.client.guilds.cache
								.filter((guild) => {
									return guild.members.cache.has(membro.user.id);
								})
								.map(
									(g) =>
										"```✙ " +
										g.name
											.replace(
												/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|)/g,
												"",
											)
											.replace("  ", " ") +
										"```",
								)
								.join("")}\n\nOutros servidores por aí:\n\n${
								data
									? data
											.map(
												(g: { name: string }) =>
													"```✙ " +
													g.name
														.replace(
															/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|)/g,
															"",
														)
														.replace("  ", " ") +
													"```",
											)
											.join("")
									: "Sem servidores."
							}`,
						}),
					],
				});
			}
			if (i.customId === "roles") {
				interaction.editReply({
					embeds: [
						createEmbed({
							color: settings.colors.default,
							thumbnail: membro.user.displayAvatarURL({ extension: "png" }),
							title: membro.user.tag,
							description: `${
								membro.roles.cache
									.map((role) => "<@&" + role + ">")
									.join(", ") || "Sem cargos."
							}`,
						}),
					],
				});
			}
		});
	},
});
