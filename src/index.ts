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
				interaction.commandName !== "apply"
			) {
				interaction.reply(
					"Este servidor não foi aprovado pela nossa rede ainda e por agora têm um pacote de Proteção Básica - isto é, você não tem acesso a comandos nenhuns porém eu banirei pessoas de outros servidores no seu!\n\n<:stats:1026116738145853470> Mas você gostaria de seu servidor ter acesso ás incríveis funções de toda a rede com o pacote Proteção Avançada?\nUtilize o comando `/candidatar` para tentar entrar dentro da rede.",
				);
				block();
				return;
			}
			const formatCommandOptions = (options: typeof interaction.options.data): string => {
				return options.map(opt => {
					let str = opt.name;
					if (opt.value) str += `: ${opt.value}`;
					if (opt.options?.length) {
						str += formatCommandOptions(opt.options);
					}
					return str;
				}).join(' ');
			};

			const timestamp = new Date().toLocaleString("pt-BR");
			const memberTag = (<GuildMember>interaction.member).user.tag;
			const memberId = (<GuildMember>interaction.member).id;

			let commandStr = interaction.commandName;
			if (interaction.options.data.length > 0) {
				commandStr += ` ${formatCommandOptions(interaction.options.data)}`;
			}

			(<TextChannel>(interaction.client.channels.cache.get("1063903328674779206"))).send({
				content: `[${timestamp}] **${memberTag}** (${memberId}) em **${interactionGuild.name}** (${interactionGuild.id}) usou **${commandStr}**`
			}).catch(() => null);
		},
	},
});
