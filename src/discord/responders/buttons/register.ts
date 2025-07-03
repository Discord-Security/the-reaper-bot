import type { Guild, GuildMember, TextChannel } from "discord.js";
import { createResponder, ResponderType } from "#base";
import { prisma } from "#database";

createResponder({
	customId: "register/:userId/:serverId",
	types: [ResponderType.Button],
	async run(interaction, { userId, serverId }) {
		interaction.reply({ content: `Aprovado por ${interaction.member}!` });

		(<TextChannel>(
			interaction.client.channels.cache.get("1025774984037146686")
		)).send({
			content: `<:Discord_Join:1041100297629597836> O staff <@${userId}> foi aprovado na equipe de ${(<Guild>interaction.client.guilds.cache.get(serverId)).name
				}. Boas-vindas!`,
		});

		const staff = await prisma.staffs.findUnique({ where: { id: userId } });

		staff
			? await prisma.staffs.update({
				where: { id: userId },
				data: { serverIds: { push: serverId } },
			})
			: await prisma.staffs.create({
				data: { id: userId, serverIds: [serverId] },
			});

		const guild = await prisma.guilds.findUnique({ where: { id: serverId } });

		const member = (<Guild>interaction.guild).members.cache.get(
			userId,
		) as GuildMember;

		member.roles.add("1025774982980186186");
		member.roles.remove("1055623367937507438");

		if (guild?.roleId && guild.roleId !== "") {
			member.roles.add(guild.roleId);
			return;
		}
		const server = interaction.client.guilds.cache.get(serverId);

		(<Guild>interaction.guild).roles
			.create({
				name: server ? server.name : "Reaper não detectou?",
				color: "#5d83b3",
				reason: "Novo cargo para registro do utilizador",
			})
			.then(async (role) => {
				member.roles.add(role);
				guild
					? await prisma.guilds.update({
						where: { id: serverId },
						data: { roleId: role.id },
					})
					: await prisma.guilds.create({
						data: { id: serverId, roleId: role.id },
					});
			});
	},
});
