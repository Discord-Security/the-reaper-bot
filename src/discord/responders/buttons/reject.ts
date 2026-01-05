import { createResponder, ResponderType } from "#base";
import { prisma } from "#database";

createResponder({
	customId: "reject/:guildId",
	types: [ResponderType.Button],
	cache: "cached",
	async run(interaction, { guildId }) {
		await interaction.reply({
			content: `Prontinho, Servidor ${guildId} rejeitado com sucesso!`,
		});
		const guild = interaction.client.guilds.cache.get(guildId);
		await prisma.guilds.delete({ where: { id: guildId } })
		if (guild) guild.leave();
	},
});
