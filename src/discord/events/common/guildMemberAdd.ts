import { createEvent } from "#base";
import { prisma } from "#database";
import { trySend } from "#functions";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import { TextChannel, time } from "discord.js";

createEvent({
	name: "guildMemberAdd",
	event: "guildMemberAdd",
	async run(member) {
		if (member.user.bot) return;

		(<TextChannel>(
			member.client.channels.cache.get(settings.canais.serverLogs)
		)).send({
			content: `[${new Date().toLocaleString("pt-BR")}] **${
				member.user.tag
			}** entrou em **${member.guild.name}** (ID: ${member.user.id})`,
		});

		const doc = await prisma.guilds.findUnique({
			where: { id: member.guild.id },
		});

		if (doc) {
			// Logs de entrada de membros

			if (
				doc &&
				doc.logs &&
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
								footer: { text: "ID do Usuário: " + member.user.id },
							}),
						],
					},
					"logs de entrada de membros",
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

					if (doc.antifake.channel !== "") {
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
							"mensagem do anti-fake",
							member.client,
						);
					}
					return;
				}
			}

			// Mensagem de Boas-vindas customizável
			if (doc.welcome && doc.welcome.active === true) {
				if (doc.welcome.roles.length > 0) {
					doc.welcome.roles.forEach(function (cargo) {
						member.roles.add(cargo).catch((err) => {
							if (err)
								(<TextChannel>(
									member.client.channels.cache.get(settings.canais.strikes)
								)).send({
									content: `<@${member.guild.ownerId}>, seu servidor ${member.guild.name} falhou ao oferecer cargo de autorole: ${err}`,
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

					const replaced = await doc.welcome.content
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
						"mensagem do bem-vindo",
						member.client,
					);
				}
			}
		}
		if (!doc) await prisma.guilds.create({ data: { id: member.guild.id } });
	},
});
