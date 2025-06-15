import { createResponder, ResponderType } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import { TextChannel } from "discord.js";

createResponder({
	customId: "approve/:id",
	types: [ResponderType.Button],
	async run(interaction, { id }) {
		interaction.reply({
			content: `Prontinho, Servidor ${id} aprovado com sucesso por ${interaction.member}!`,
		});

		const channelGeral = <TextChannel>(
			interaction.client.channels.cache.get("1025774984037146686")
		);
		channelGeral.send({
			content: `<:Discord_Join:1041100297629597836> O servidor ${
				interaction.client.guilds.cache.get(id)?.name
			} foi aprovado na nossa rede. Boas-vindas e espero que gostem da nossa rede!`,
		});

		const guild = await prisma.guilds.findUnique({ where: { id } });
		guild
			? await prisma.guilds.update({ where: { id }, data: { approved: true } })
			: await prisma.guilds.create({ data: { id, approved: true } });

		const guilds = await prisma.guilds.findMany({ where: { approved: true } });

		(<TextChannel>(
			interaction.client.channels.cache.get("1040362329868607629")
		)).messages
			.fetch({ limit: 1 })
			.then((msg: { first: () => any }) => {
				const fetchedMsg = msg.first();
				fetchedMsg.edit({
					content: "",
					embeds: [
						createEmbed({
							color: settings.colors.default,
							title: "Servidores no The Reaper!",
							image: "https://i.imgur.com/BAwY6H0.png",
							description:
								`Atualmente temos ${guilds.length} servidores na nossa rede: \n\n` +
								guilds
									.sort((a: { id: string }, b: { id: string }) => {
										const a1 = interaction.client.guilds.cache.get(a.id);
										const b1 = interaction.client.guilds.cache.get(b.id);
										const a1name = a1
											? a1.name
													.replace(
														/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|)/g,
														"",
													)
													.replace("  ", " ")
											: "";
										const b1name = b1
											? b1.name
													.replace(
														/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|)/g,
														"",
													)
													.replace("  ", " ")
											: "";
										return (a1 ? a1name : a.id) < (b1 ? b1name : b.id)
											? -1
											: (a1 ? a1name : a.id) > (b1 ? b1name : b.id)
												? 1
												: 0;
									})
									.map((guild: { id: string }) => {
										const nome = interaction.client.guilds.cache.get(guild.id);
										return `\`\`\`✙ ${
											nome
												? nome.name
														.replace(
															/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|)/g,
															"",
														)
														.replace("  ", " ")
												: guild.id
										}\`\`\``;
									})
									.join(""),
						}),
					],
				});
			});
	},
});
