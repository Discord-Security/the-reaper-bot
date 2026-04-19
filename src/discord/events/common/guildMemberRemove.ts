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

		const guildData = await prisma.guilds.findUnique({
			where: { id: member.guild.id },
		});

		if (guildData) {
			if (
				guildData.logs &&
				guildData.logs.leftMember !== "" &&
				guildData.logs.leftMember !== undefined &&
				guildData.logs.leftMember !== null
			) {
				trySend(
					guildData.logs.leftMember,
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
					`O canal <#${guildData.logs.leftMember}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/logs type: Saída de Membro activated: True channel:\`)`,
					member.client,
				);
			}
			if (
				guildData.logs &&
				guildData.logs.punishments !== "" &&
				guildData.logs.punishments !== undefined &&
				guildData.logs.punishments !== null
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
						member.client.channels.cache.get(guildData.logs.punishments)
					)).send({ embeds: [emb] });
					trySend(
						guildData.logs.punishments,
						member.guild,
						{ embeds: [emb] },
						`O canal <#${guildData.logs.punishments}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/logs type: Entrada de Membros activated: True channel:\`)`,
						member.client,
					);
				}
			}
			if (
				guildData.exit &&
				guildData.exit.active === true &&
				guildData.exit.channel !== undefined &&
				guildData.exit.channel !== null
			) {
				const memberCount = member.guild.memberCount;
				const accountAge = time(member.user.createdAt, "f");
				const userId = member.user.id;
				const username = member.user.username;
				const userTag = member.user.tag;
				const avatar = member.user.displayAvatarURL({
					extension: "png",
				});
				const mention = `<@${member.user.id}>`;
				const serverName = member.guild.name;
				const serverId = member.guild.id;
				const serverIcon = member.guild.iconURL({
					extension: "png",
				});

				const replaced = guildData.exit.content
					.replace('"%avatar"', `"${avatar}"`)
					.replace("%contadorMembros", memberCount.toString())
					.replace("%contadorRegistro", accountAge)
					.replace("%id", userId)
					.replace("%nome", username)
					.replace("%tag", userTag)
					.replace("%membro", mention)
					.replace("%serverNome", serverName)
					.replace("%serverId", serverId)
					.replace('"%serverIcon"', `"${serverIcon}"`);

				const parsed = JSON.parse(replaced);

				(<TextChannel>member.client.channels.cache.get(guildData.exit.channel))
					.send(parsed)
					.then((msg) => {
						if (guildData.exit?.timeout === 0) return;
						setTimeout(() => {
							msg.delete();
						}, guildData.exit?.timeout);
					})
					.catch((err) => {
						(<TextChannel>(
							member.client.channels.cache.get(settings.canais.strikes)
						)).send({
							content: `<@${member.guild.ownerId}>\n**Servidor:** ${member.guild.name} (${member.guild.id})\n**O que falhou**: Enviar mensagem de saída em <#${guildData.exit?.channel}>. (Recomendado: Verificar se o canal existe ou se a mensagem colocada é válida.)\n**Erro para o desenvolvedor:**\n${err}`,
						});
					});
			}
		}
	},
});
