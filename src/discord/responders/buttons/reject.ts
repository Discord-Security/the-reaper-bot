import { createResponder, ResponderType } from "#base";
import { prisma } from "#database";

createResponder({
	customId: "reject/:id",
	types: [ResponderType.Button],
	async run(interaction, { id }) {
		interaction.reply({
			content: `Prontinho, Servidor ${id} rejeitado com sucesso!`,
		});
		const guild = interaction.client.guilds.cache.get(id);
		await prisma.guilds.delete({ where: { id } })
		if (guild) guild.leave();
	},
});
