import { createEvent } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import { Guild, TextChannel } from "discord.js";

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
			content: `<@${guild.ownerId}>, seu servidor ${guild.name} me retirou, me adicione novamente e peça por aprovação a um dos administradores! Ao eu ser retirado de um servidor, excluo todos os dados definidos como canais de logs, welcomes e aprovações dentro de 6 horas.`,
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
					if (doc && doc.roleId) {
						const role = (<Guild>(
							guild.client.guilds.cache.get("1025774982980186183")
						)).roles.cache.get(doc.roleId);
						if (!role) return;
						if (role.members)
							role.members.map((member) => {
								if (member.roles.cache.size > 2) return;
								member.roles.remove("1025774982980186186");
								member.roles.add("1055623367937507438");
								return;
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
