import type { Guild, Role } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { settings } from "#settings";

createEvent({
	name: "guildUpdate",
	event: "guildUpdate",
	async run(oldGuild, newGuild) {
		if (oldGuild.name !== newGuild.name) {
			const guildData = await prisma.guilds.findUnique({
				where: { id: newGuild.id },
			});

			if (!guildData?.roleId) return;
			const reaperGuild = <Guild>newGuild.client.guilds.cache.get(settings.guildID);
			(<Role>reaperGuild.roles.cache.find((r) => r.id === guildData.roleId)).setName(
				newGuild.name,
			);
		}
	},
});
