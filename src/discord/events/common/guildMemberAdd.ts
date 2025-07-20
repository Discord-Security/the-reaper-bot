import { createEmbed } from "@magicyan/discord";
import { type TextChannel, time } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { trySend } from "#functions";
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

		const doc = await prisma.guilds.findUnique({
			where: { id: member.guild.id },
		});

		if (doc) {
			// Logs de entrada de membros

			if (
				doc?.logs &&
				doc.logs.joinedMember !== "" &&
				doc.logs.joinedMember !== undefined &&
				doc.logs.joinedMember !== null
			) {
				trySend(
					doc.logs.joinedMember,
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
					`O canal <#${doc.logs.joinedMember}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/logs type: Entrada de Membro activated: True channel:\`)`,
					member.client,
				);
			}

			// Anti fake

			if (doc.antifake && doc.antifake.active !== false) {
				if (
					parseInt(
						(
							Date.now() - member.user.createdAt.getUTCMilliseconds()
						).toString(),
					) < parseInt(doc.antifake.time.toString())
				) {
					doc.antifake.action === "Kick"
						? member.kick(
							"O usuário têm uma conta nova, expulso pelo anti-fake.",
						)
						: member.ban({
							reason: "O usuário têm uma conta nova, banido pelo anti-fake.",
						});

					if (doc.antifake.channel !== "" && doc.antifake.channel !== null) {
						trySend(
							doc.antifake.channel,
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
											{ name: "Ação Tomada", value: doc.antifake.action },
										],
									}),
								],
							},
							`O canal <#${doc.antifake.channel}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/antifake channel channel:\`)`,
							member.client,
						);
					}
					return;
				}
			}

			// Mensagem de Boas-vindas customizável
			if (doc.welcome && doc.welcome.active === true) {
				if (doc.welcome.roles.length > 0) {
					doc.welcome.roles.forEach((cargo) => {
						member.roles.add(cargo).catch((err) => {
							if (err)
								(<TextChannel>(
									member.client.channels.cache.get(settings.canais.strikes)
								)).send({
									content: `<@${member.guild.ownerId}>\n**Servidor:** ${member.guild.name} (${member.guild.id})\n**O que falhou**: Autorole no welcome para o cargo ${cargo} falhou. (Recomendado: Cargo existe? Minha posição está abaixo do cargo a ser dado?)\n**Erro para o desenvolvedor:**\n${err}`,
								});
						});
					});
				}

				if (doc.welcome.channel !== undefined && doc.welcome.channel !== null) {
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

					const replaced = doc.welcome.content
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

					trySend(
						doc.welcome.channel,
						member.guild,
						parsed,
						`O canal <#${doc.welcome.channel}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/welcome channel channel:\`)`,
						member.client,
					);
				}
			}
		}
		if (!doc) await prisma.guilds.create({ data: { id: member.guild.id } });
	},
});
