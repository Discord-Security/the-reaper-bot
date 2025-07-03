import { createEmbed } from "@magicyan/discord";
import { type TextChannel, time, type User } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { trySend } from "#functions";
import { settings } from "#settings";

createEvent({
	name: "guildMemberRemove",
	event: "guildMemberRemove",
	async run(member) {
		if (member.user.bot) return;

		(<TextChannel>(
			member.client.channels.cache.get(settings.canais.serverLogs)
		)).send({
			content: `[${new Date().toLocaleString("pt-BR")}] **${member.user.tag
				}** saiu em **${member.guild.name}** (ID: ${member.user.id})`,
		});

		const doc = await prisma.guilds.findUnique({
			where: { id: member.guild.id },
		});

		if (doc) {
			if (
				doc.logs &&
				doc.logs.leftMember !== "" &&
				doc.logs.leftMember !== undefined &&
				doc.logs.leftMember !== null
			) {
				trySend(
					doc.logs.leftMember,
					member.guild,
					{
						embeds: [
							createEmbed({
								description: `***${member.user.tag}* | Membro __Saiu__**`,
								color: settings.colors.default,
								fields: [{ name: "Tag:", value: member.user.tag }],
								footer: { text: `ID do Usuário: ${member.user.id}` },
							}),
						],
					},
					"logs de saída de membros",
					member.client,
				);
			}
			if (
				doc.logs &&
				doc.logs.punishments !== "" &&
				doc.logs.punishments !== undefined &&
				doc.logs.punishments !== null
			) {
				const fetchedLogs = await member.guild.fetchAuditLogs({
					limit: 1,
					type: 20,
				});
				const kickLog = fetchedLogs.entries.first();

				if (!kickLog) return;

				const { executor, target } = kickLog;

				if ((<User>target).id === member.id) {
					const emb = createEmbed({
						color: settings.colors.default,
						description: `***${member.user.tag
							}* | Membro __Expulso__**\n\n<:Discord_Danger:1028818835148656651> **Usuário:**\nTag: \`${member.user.tag
							}\`\nID: \`${member.user.id
							}\`\n\n<:Discord_Info:1036702634603728966> **Moderador:**\nTag: \`${(<User>executor).tag || "Desconhecido"
							}\`\nID: \`${(<User>executor).id || "Desconhecido"
							}\`\n\n<:Discord_Chat:1035624171960541244> **Motivo:**\n\`${kickLog.reason || "Sem Motivo"
							}\``,
					});
					(<TextChannel>(
						member.client.channels.cache.get(doc.logs.punishments)
					)).send({ embeds: [emb] });
					trySend(
						doc.logs.punishments,
						member.guild,
						{ embeds: [emb] },
						"logs de punições (Kick)",
						member.client,
					);
				}
			}
			if (
				doc.exit &&
				doc.exit.active === true &&
				doc.exit.channel !== undefined &&
				doc.exit.channel !== null
			) {
				// Variáveis

				const contadorMembros = member.guild.memberCount;
				const contadorRegistro = time(member.user.createdAt, "f");
				const id = member.user.id;
				const nome = member.user.username;
				const tag = member.user.tag;
				const avatar = member.user.displayAvatarURL({
					extension: "png",
				});
				const membro = `<@${member.user.id}>`;
				const serverNome = member.guild.name;
				const serverId = member.guild.id;
				const serverIcon = member.guild.iconURL({
					extension: "png",
				});

				const replaced = await doc.exit.content
					.replace('"%avatar"', `"${avatar}"`)
					.replace("%contadorMembros", contadorMembros.toString())
					.replace("%contadorRegistro", contadorRegistro)
					.replace("%id", id)
					.replace("%nome", nome)
					.replace("%tag", tag)
					.replace("%membro", membro)
					.replace("%serverNome", serverNome)
					.replace("%serverId", serverId)
					.replace('"%serverIcon"', `"${serverIcon}"`);

				const parsed = JSON.parse(replaced);

				(<TextChannel>member.client.channels.cache.get(doc.exit.channel))
					.send(parsed)
					.then((msg) => {
						if (doc.exit?.timeout === 0) return;
						setTimeout(() => {
							msg.delete();
						}, doc.exit?.timeout);
					})
					.catch((err) => {
						(<TextChannel>(
							member.client.channels.cache.get(settings.canais.strikes)
						)).send({
							content: `<@${member.guild.ownerId}>, seu servidor ${member.guild.name} falhou ao enviar mensagem de saída: ${err}`,
						});
					});
			}
		}
	},
});
