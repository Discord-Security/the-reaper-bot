import { createEmbed, createRow } from "@magicyan/discord";
import { StringSelectMenuBuilder, type TextChannel } from "discord.js";
import { createEvent } from "#base";
import { prisma } from "#database";
import { trySend } from "#functions";
import { settings } from "#settings";

createEvent({
	name: "messageCreate",
	event: "messageCreate",
	async run(message) {
		if (message.guild === null) return;

		const guildId = message.guildId as string;
		const doc = await prisma.guilds.findUnique({
			where: { id: guildId },
		});

		if (!doc) {
			prisma.guilds.create({ data: { id: guildId } });
			return;
		}

		if (
			doc.channelsAutopublish.includes(message.channel.id) &&
			message.content !== "<@&813074590456741888>" &&
			message.content !== "<@&813074615147692042>"
		) {
			message.crosspost().catch((err) => {
				if (err) return;
			});
		}

		if (message.author.bot) return;

		if (
			doc?.partnerWarning?.activated &&
			message.channel.id === doc.partnerWarning.channel
		) {
			const id = `${message.author.id}-${guildId}`;
			const db = await prisma.partners.findUnique({
				where: { id, serverId: guildId },
			});
			db
				? prisma.partners.update({
					where: { id, serverId: guildId },
					data: { partners: db.partners + 1 },
				})
				: prisma.partners.create({
					data: { id, serverId: guildId, partners: 1 },
				});

			const partners = await prisma.partners.findMany({
				where: { serverId: guildId },
				orderBy: { partners: "asc" },
			});
			const currentPartnerCount = db ? db.partners + 1 : 1;

			const membroRank =
				partners.reduce((prev: number, curr: { partners: number }) => {
					if (curr.partners >= currentPartnerCount) {
						return prev + 1;
					}
					return prev;
				}, 0) + 1;

			const idRegex = /<@(\d+)>/;
			const match = message.content.match(idRegex);
			const serverNome = message.guild.name;
			const serverId = guildId;
			const serverIcon = message.guild.iconURL({
				extension: "png",
			});
			const avatar = message.author.displayAvatarURL({
				extension: "png",
			});
			const replaced = doc?.partnerWarning?.message
				?.replace("%membroTag", message.author.tag)
				.replace("%membroId", message.author.id)
				.replace("%membroMenção", `<@${message.author.id}>`)
				.replace("%membroRank", membroRank.toString() || "0")
				.replace("%membroParcerias", db ? db.partners.toString() : "1")
				.replace('"%membroAvatar"', `"${avatar}"`)
				.replace("%serverNome", serverNome)
				.replace("%serverId", serverId)
				.replace('"%serverIcon"', `"${serverIcon}"`)
				.replace("%representante", match !== null ? match[0] : "Desconhecido");

			// %membro é o utilizador que enviou a mensagem, %membroparcerias é o número total de parcerias que a pessoa fez +1, %membrorank é o número do rank que ela está naquele servidor.
			trySend(
				doc.partnerWarning.channel,
				message.guild,
				JSON.parse(replaced as string),
				`O canal <#${doc.partnerWarning.channel}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/partners_warn channel channel:\`)`,
				message.client,
			);
		}

		if (guildId === "1025774982980186183") {
			(<TextChannel>(
				message.client.channels.cache.get("1037138353369382993")
			)).threads
				.fetch(message.channel.id)
				.then((thread) => {
					if ((thread?.messageCount ?? 0) > 1) return;
					const tags = `1048779154738384987,${thread?.appliedTags.toString()}`;
					thread
						?.edit({
							appliedTags: tags.split(","),
						})
						.catch(() => {
							return;
						});
				})
				.catch(() => {
					return;
				});
		}

		if (guildId !== settings.guildID) {
			if (message.content.startsWith(`<@${message.client.user.id}>`)) {
				message.reply(
					"Olá, eu sou The Reaper, um bot de moderação para o Discord. Como moderador, você pode contar com minhas habilidades para garantir que o seu servidor seja um lugar seguro e agradável para todos. Eu posso ajudar a manter o ordem, filtrar conteúdos inapropriados e punir os infratores. Além disso, eu ofereço recursos avançados de gerenciamento de membros e configurações personalizáveis. Utilize minhas funções para obter acesso e comece a usufruir de minhas funcionalidades agora!",
				);
			}
		}

		if (guildId === process.env.GUILD_ID) {
			if (message.member && !message.member.permissions.has("Administrator"))
				return;
			if (message.content.startsWith(`<@${message.client.user.id}>`)) {
				message.reply({
					embeds: [
						createEmbed({
							title: "Reaper Control - A fast and efficient control",
							description:
								"Controle a adesão de novos servidores, comandos de desenvolvimento tudo num menu de controlo rápido e eficiente!",
							color: settings.colors.default,
						}),
					],
					components: [
						createRow(
							new StringSelectMenuBuilder()
								.setCustomId("control")
								.setPlaceholder("Controle tudo imediatamente!")
								.addOptions(
									{
										label: "Aprovar servidor",
										description: "Aprove um novo servidor na rede",
										value: "approve",
										emoji: "1026116735759302727",
									},
									{
										label: "Rejeitar servidor",
										description: "Servidor problemático na rede? Remova-o!",
										value: "reject",
										emoji: "1026116707770712136",
									},
									{
										label: "Faça evaluate de um código (dev only)",
										description: "Cuidado isto pode ser perigoso!",
										value: "eval",
										emoji: "1026116730969395311",
									},
								),
						),
					],
				});
			}
		}
	},
});
