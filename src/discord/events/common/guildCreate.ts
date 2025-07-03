import { createEmbed, createRow } from "@magicyan/discord";
import {
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	PermissionFlagsBits,
	type TextChannel,
} from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";

createEvent({
	name: "guildCreate",
	event: "guildCreate",
	async run(guild) {
		(<TextChannel>guild.client.channels.cache.get("1025774984402059436")).send({
			embeds: [
				createEmbed({
					title: guild.name,
					fields: [
						{ name: "👑 Dono:", value: guild.ownerId, inline: true },
						{
							name: "👥 Usuários:",
							value: guild.memberCount.toString(),
							inline: true,
						},
						{ name: "🆔", value: guild.id.toString(), inline: true },
					],
					thumbnail: guild.iconURL(),
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

		const reaper = await prisma.reapers.findUnique({ where: { id: "1" } });
		if (reaper) {
			if (reaper.databaseExclude.find((item) => item.id === guild.id)) {
				await prisma.reapers.update({
					where: { id: "1" },
					data: {
						databaseExclude: reaper.databaseExclude.filter(
							(item) => item.id !== guild.id,
						),
					},
				});
			} else {
				await prisma.guilds.create({ data: { id: guild.id } });
			}
		}
		guild.channels
			.create({
				name: "reaper",
				type: ChannelType.GuildText,
				permissionOverwrites: [
					{
						id: guild.id,
						allow: [PermissionFlagsBits.ViewChannel],
						deny: [PermissionFlagsBits.SendMessages],
					},
				],
			})
			.then((c) => {
				c.send({
					embeds: [
						createEmbed({
							color: settings.colors.default,
							image: "https://i.imgur.com/eTojWij.jpeg",
							title: "Este servidor está seguro com The Reaper",
							description:
								"'Oi, sou o The Reaper, um bot de proteção para o Discord. Meu trabalho é manter todos os servidores limpos e seguros, removendo usuários tóxicos que possam causar problemas ou violar as regras. Já bani mais de 15 mil usuários desde que fui criado e estou comprometido em fornecer o melhor serviço para todos os criadores de servidores. Se você seguir as regras do Discord, pode contar comigo para ajudar a manter a ordem e a paz no seu servidor.\n\nEu sou capaz de banir usuários que tenham cometido infrações graves, como o envio de spam ou conteúdos impróprios em todos os servidores ao mesmo tempo. Meu sistema é rápido e eficaz para remover rapidamente os usuários problemáticos e evitar danos ou incômodos aos outros membros do servidor.\n\nSe você quer ter certeza de que seu servidor está protegido contra usuários tóxicos, eu sou a escolha certa para você. Para ter acesso ao meu serviço, você precisará se [candidatar à minha rede](https://discord.gg/TnvvwUStHK). Lembre-se de que o meu foco é a segurança dos servidores, portanto, todas as alianças, projetos e redes não devem se importar em bloquear o uso do bot para membros que não estejam na rede de segurança. A rede também é o lugar onde você pode acompanhar as novidades e avisos de segurança.'",
						}),
					],
					components: [
						createRow(
							new ButtonBuilder()
								.setStyle(ButtonStyle.Link)
								.setURL("https://discord.gg/TnvvwUStHK")
								.setLabel("Participar!")
								.setEmoji("1041100297629597836"),
						),
					],
				});
			})
			.catch(() => {
				return;
			});
	},
});
