import type { GuildMember, MessageCreateOptions } from "discord.js";
import { trySend } from "./trySend.js";

interface WelcomeConfig {
	channel: string;
	content: string;
}

const WINDOW_MS = 15 * 60 * 1000;
const BURST_THRESHOLD = 5;
const FLUSH_QUIET_MS = 20 * 1000;

interface GuildBatch {
	joins: number[];
	queue: GuildMember[];
	batching: boolean;
	quietTimer: NodeJS.Timeout | null;
	windowTimer: NodeJS.Timeout | null;
}

const batches = new Map<string, GuildBatch>();

function timeFull(date: Date): string {
	return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

function renderWelcome(
	members: GuildMember[],
	content: string,
): MessageCreateOptions {
	const first = members[0];
	const avatar = first.user.displayAvatarURL({ extension: "png" });
	const serverIcon = first.guild.iconURL({ extension: "png" });

	const replaced = content
		.replace('"%avatar"', `"${avatar}"`)
		.replace("%contadorMembros", first.guild.memberCount.toString())
		.replace("%contadorRegistro", timeFull(first.user.createdAt))
		.replace("%id", members.map((m) => m.user.id).join(", "))
		.replace("%nome", members.map((m) => m.user.username).join(", "))
		.replace("%tag", members.map((m) => m.user.tag).join(", "))
		.replace("%membro", members.map((m) => `<@${m.user.id}>`).join(" "))
		.replace("%serverNome", first.guild.name)
		.replace("%serverId", first.guild.id)
		.replace('"%serverIcon"', `"${serverIcon}"`);

	const message: MessageCreateOptions = JSON.parse(replaced);
	message.allowedMentions = { users: members.map((m) => m.user.id) };
	return message;
}

function errorMessage(channel: string): string {
	return `O canal <#${channel}> foi apagado ou não há acesso. (Recomendado: Ver permissões do canal ou definir um novo canal em \`/welcome channel channel:\`)`;
}

function send(members: GuildMember[], config: WelcomeConfig) {
	if (members.length === 0) return;
	trySend(
		config.channel,
		members[0].guild,
		renderWelcome(members, config.content),
		errorMessage(config.channel),
		members[0].client,
	);
}

function flush(guildId: string, config: WelcomeConfig) {
	const batch = batches.get(guildId);
	if (!batch) return;

	if (batch.quietTimer) clearTimeout(batch.quietTimer);
	if (batch.windowTimer) clearTimeout(batch.windowTimer);
	batch.quietTimer = null;
	batch.windowTimer = null;
	batch.batching = false;

	send(batch.queue.splice(0), config);
}

function scheduleFlush(guildId: string, config: WelcomeConfig) {
	const batch = batches.get(guildId);
	if (!batch) return;

	if (batch.quietTimer) clearTimeout(batch.quietTimer);
	batch.quietTimer = setTimeout(() => flush(guildId, config), FLUSH_QUIET_MS);

	if (!batch.windowTimer) {
		batch.windowTimer = setTimeout(() => flush(guildId, config), WINDOW_MS);
	}
}

export function handleWelcome(member: GuildMember, config: WelcomeConfig) {
	const guildId = member.guild.id;
	const now = Date.now();

	let batch = batches.get(guildId);
	if (!batch) {
		batch = { joins: [], queue: [], batching: false, quietTimer: null, windowTimer: null };
		batches.set(guildId, batch);
	}

	batch.joins = batch.joins.filter((t) => now - t < WINDOW_MS);
	batch.joins.push(now);

	if (batch.batching || batch.joins.length >= BURST_THRESHOLD) {
		batch.batching = true;
		batch.queue.push(member);
		scheduleFlush(guildId, config);
		return;
	}

	send([member], config);
}
