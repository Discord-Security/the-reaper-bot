import type { Guild, GuildMember, TextChannel } from "discord.js";
import { bootstrap, setupCreators } from "#base";
import { prisma } from "#database";

import "dotenv/config";

await bootstrap({ meta: import.meta });

setupCreators({
	commands: {
		async middleware(interaction, block) {
			const interactionGuild = <Guild>interaction.guild;
			const guild = await prisma.guilds.findUnique({
				where: { id: interactionGuild.id },
			});
			if (!guild) {
				prisma.guilds.create({ data: { id: interactionGuild.id } });
				interaction.reply(
					"Este servidor está sendo cadastrado em nosso banco de dados, tente novamente.",
				);
				return;
			}
			if (
				guild.approved === false &&
				interaction.commandName !== "candidatar"
			) {
				interaction.reply(
					"Este servidor não foi aprovado pela nossa rede ainda e por agora têm um pacote de Proteção Básica - isto é, você não tem acesso a comandos nenhuns porém eu banirei pessoas de outros servidores no seu!\n\n<:stats:1026116738145853470> Mas você gostaria de seu servidor ter acesso ás incríveis funções de toda a rede com o pacote Proteção Avançada?\nUtilize o comando `/candidatar` para tentar entrar dentro da rede.",
				);
				block();
				return;
			}
			(<TextChannel>(
				interaction.client.channels.cache.get("1063903328674779206")
			))
				.send({
					content: `[${new Date().toLocaleString("pt-BR")}] **${(<GuildMember>interaction.member).user.tag
						}** em **${interactionGuild.name}** usou **${interaction.commandName
						} ${interaction.options.data.length > 0 && interaction?.options.data
							.map((option) => {
								return `${option.name}${option.value && `: ${option.value}${option.options && option.options.length > 0 && option.options.map((optionSub) => {
									return `${optionSub.name}: ${optionSub.value}`
								})}`}`;
							}).join(" ")}** (ID: ${(<GuildMember>interaction.member).id})`,
				})
				.catch((err) => {
					if (err) return;
				});
		},
	},
});
