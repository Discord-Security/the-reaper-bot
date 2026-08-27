import { createEmbed } from "@magicyan/discord";
import { type TextChannel, time } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { handleWelcome, trySend } from "#functions";
import { settings } from "#settings";

createEvent({
	name: "guildMemberAdd",
	event: "guildMemberAdd",
	async run(member) {
		if (member.user.bot) return;

		(<TextChannel>(
			member.client.channels.cache.get(settings.canais.serverLogs)
		)).send({
			content: `[${new Date().toLocaleString("pt-BR")}] **${member.user.tag
				}** entrou em **${member.guild.name}** (ID: ${member.user.id})`,
		});

		const guildData = await prisma.guilds.findUnique({
			where: { id: member.guild.id },
		});

		if (guildData) {
			if (
				guildData?.logs &&
				guildData.logs.joinedMember !== "" &&
				guildData.logs.joinedMember !== undefined &&
				guildData.logs.joinedMember !== null
			) {
				trySend(
					guildData.logs.joinedMember,
					member.guild,
					{
						embeds: [
							createEmbed({
								description: `***${member.user.tag}* | Membro __Entrou__**`,
								color: settings.colors.default,
								fields: [
									{ name: "Tag:", value: member.user.tag },
									{
										name: "Data de Criação:",
										value: time(member.user.createdAt, "f") || "Unknown",
									},
								],
								image: "https://i.imgur.com/VM2deMh.png",
								footer: { text: `ID do Usuário: ${member.user.id}` },
							}),
						],
					},
					`O canal <#${guildData.logs.joinedMember}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/logs type: Entrada de Membro activated: True channel:\`)`,
					member.client,
				);
			}

			if (guildData.antifake && guildData.antifake.active !== false) {
				if (
					parseInt(
						(
							Date.now() - member.user.createdAt.getUTCMilliseconds()
						).toString(), 10 
					) < parseInt(guildData.antifake.time.toString(), 10)
				) {
					guildData.antifake.action === "Kick"
						? member.kick(
							"O usuário坟reen uma conta nova, expulso pelo anti-fake.",
						)
						: member.ban({
							reason: "O usuário坟reen uma conta nova, banido pelo anti-fake.",
						});

					if (guildData.antifake.channel !== "" && guildData.antifake.channel !== null) {
						trySend(
							guildData.antifake.channel,
							member.guild,
							{
								embeds: [
									createEmbed({
										author: {
											name: "Novo usuário detectado no Anti-Fake!",
											iconURL: "https://i.imgur.com/0MqlDVt.png",
										},
										color: settings.colors.default,
										fields: [
											{ name: "ID", value: member.user.id },
											{
												name: "Data de Criação",
												value:
													time(member.user.createdAt, "f") || "Desconhecido",
											},
											{ name: "Ação Tomada", value: guildData.antifake.action },
										],
									}),
								],
							},
							`O canal <#${guildData.antifake.channel}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/antifake channel channel:\`)`,
							member.client,
						);
					}
					return;
				}
			}

			if (guildData.welcome && guildData.welcome.active === true) {
				if (guildData.welcome.roles.length > 0) {
					guildData.welcome.roles.forEach((role) => {
						member.roles.add(role).catch((err) => {
							if (err)
								(<TextChannel>(
									member.client.channels.cache.get(settings.canais.strikes)
								)).send({
									content: `<@${member.guild.ownerId}>\n**Servidor:** ${member.guild.name} (${member.guild.id})\n**O que falhou**: Autorole no welcome para o cargo ${role} falhou. (Recomendado: Cargo existe? Minha posição está abaixo do cargo a ser dado?)\n**Erro para o desenvolvedor:**\n${err}`,
								});
						});
					});
				}

				if (guildData.welcome.channel !== undefined && guildData.welcome.channel !== null) {
					handleWelcome(member, {
						channel: guildData.welcome.channel,
						content: guildData.welcome.content,
					});
				}
			}
		}
		if (!guildData) await prisma.guilds.create({ data: { id: member.guild.id } });
	},
});
