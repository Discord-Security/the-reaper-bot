import type { Guild, Role } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";

createEvent({
	name: "guildUpdate",
	event: "guildUpdate",
	async run(oldGuild, newGuild) {
		if (oldGuild.name !== newGuild.name) {
			const doc = await prisma.guilds.findUnique({
				where: { id: newGuild.id },
			});

			if (!doc || !doc.roleId) return;
			const guild = <Guild>newGuild.client.guilds.cache.get(settings.guildID);
			(<Role>guild.roles.cache.find((r) => r.id === doc.roleId)).setName(
				newGuild.name,
			);
		}
	},
});
