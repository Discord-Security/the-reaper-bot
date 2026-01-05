import { createEmbed } from "@magicyan/discord";
import type { Guild, TextChannel } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";

createEvent({
	name: "guildDelete",
	event: "guildDelete",
	async run(guild) {
		(<TextChannel>guild.client.channels.cache.get("1025774984402059437")).send({
			embeds: [
				createEmbed({
					title: guild.name,
					fields: [{ name: "🆔", value: guild.id.toString(), inline: true }],
					thumbnail: guild.iconURL(),
					color: settings.colors.default,
				}),
			],
		});

		(<TextChannel>(
			guild.client.channels.cache.get(settings.canais.strikes)
		)).send({
			content: `<@${guild.ownerId}>\n**Servidor:** ${guild.name} (${guild.id})\n**O que falhou**: Fui removido do seu servidor. (Recomendado: Adicione novamente ou suas configurações serão apagadas em 6 horas.)`,
		});

		const reaper = await prisma.reapers.findUnique({ where: { id: "1" } });
		if (reaper) {
			const _date = new Date();
			_date.setHours(_date.getHours() + 6);
			const date = new Date(_date);
			await prisma.reapers.update({
				where: { id: "1" },
				data: { databaseExclude: { push: { id: guild.id, schedule: date } } },
			});
		}

		setTimeout(async () => {
			const reaper = await prisma.reapers.findUnique({ where: { id: "1" } });
			if (reaper) {
				if (reaper.databaseExclude.find((item) => item.id === guild.id)) {
					const doc = await prisma.guilds.findUnique({
						where: { id: guild.id },
					});
					if (doc?.roleId) {
						const role = (<Guild>(
							guild.client.guilds.cache.get("1025774982980186183")
						)).roles.cache.get(doc.roleId);
						if (!role) return;
						if (role.members)
							role.members.forEach((member) => {
								if (member.roles.cache.size > 2) return;
								member.roles.remove("1025774982980186186");
								member.roles.add("1055623367937507438");
							});
						role.delete();
					}
					await prisma.guilds.delete({ where: { id: guild.id } });
					await prisma.reapers.update({
						where: { id: "1" },
						data: {
							databaseExclude: reaper.databaseExclude.filter(
								(item) => item.id !== guild.id,
							),
						},
					});
				}
			}
		}, 21600000);
	},
});
