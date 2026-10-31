import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { Client } from "discord.js";
import { prisma } from "#database";
import { fetchFeed, type RssItem } from "./rss.js";

const TICK_MS = 2 * 60_000;
const BASE_INTERVAL_MS = 5 * 60_000;
const MAX_BACKOFF_MS = 6 * 3_600_000;
const WINDOW = 20;
const MAX_ITEM_AGE_MS = 30 * 86_400_000;
const SEEN_TTL_MS = 120 * 86_400_000;
const CONCURRENCY = 5;
const MAX_SENDS_PER_RUN = 5;

type Sub = {
	guildId: string;
	feed: {
		id: string;
		channel: string;
		message: string;
		filter: string[];
	};
};

const esc = (v: string) => JSON.stringify(v).slice(1, -1);

const render = (template: string, item: RssItem) =>
	JSON.parse(
		template
			.replaceAll("%title", esc(item.title))
			.replaceAll("%url", esc(item.link))
			.replaceAll("%creator", esc(item.creator))
			.replaceAll("%guid", esc(item.guid))
			.replaceAll("%date", esc(item.date.toString())),
	);

const claim = async (guildId: string, feedUrl: string, key: string) => {
	try {
		const id = createHash("sha1").update(`${guildId}\0${feedUrl}\0${key}`).digest("hex");
		await prisma.rssSeenItem.create({ data: { id, guildId, feedUrl } });
		return true;
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
			return false;
		throw e;
	}
};

async function processSub(client: Client, url: string, sub: Sub, items: RssItem[]) {
	const minDate = Date.now() - MAX_ITEM_AGE_MS;
	const window = items.filter((i) => i.date.getTime() >= minDate).slice(-WINDOW);
	if (!window.length) return;

	const seeded =
		(await prisma.rssSeenItem.count({
			where: { guildId: sub.guildId, feedUrl: url },
		})) > 0;

	const filters = sub.feed.filter.filter(Boolean).map((f) => f.toLowerCase());

	let sent = 0;
	for (const item of window) {
		if (!(await claim(sub.guildId, url, item.key))) continue;
		if (!seeded) continue;
		if (++sent > MAX_SENDS_PER_RUN) continue;
		const title = item.title.toLowerCase();
		if (filters.some((f) => title.includes(f))) continue;
		try {
			const channel = await client.channels.fetch(sub.feed.channel);
			if (channel?.isSendable()) await channel.send(render(sub.feed.message, item));
		} catch (e) {
			console.error(`[RSS] envio falhou (${sub.guildId} ${url}):`, e);
		}
	}
}

async function processUrl(client: Client, url: string, subs: Sub[]) {
	const state = await prisma.rssFeedState.findUnique({ where: { id: url } });
	let allSeeded = true;
	for (const s of subs) {
		const n = await prisma.rssSeenItem.count({
			where: { guildId: s.guildId, feedUrl: url },
		});
		if (n === 0) allSeeded = false;
	}

	const res = await fetchFeed(url, allSeeded ? (state ?? {}) : {});
	const now = new Date();

	if (res.status === "error") {
		const failures = (state?.failures ?? 0) + 1;
		const backoff = Math.max(
			res.retryAfterMs ?? 0,
			Math.min(BASE_INTERVAL_MS * 2 ** failures, MAX_BACKOFF_MS),
		);
		await prisma.rssFeedState.upsert({
			where: { id: url },
			create: {
				id: url,
				failures,
				lastError: res.error,
				lastCheckedAt: now,
				nextCheckAt: new Date(Date.now() + backoff),
			},
			update: {
				failures,
				lastError: res.error,
				lastCheckedAt: now,
				nextCheckAt: new Date(Date.now() + backoff),
			},
		});
		console.warn(`[RSS] ${url}: ${res.error} (falha ${failures})`);
		return;
	}

	if (res.status === "ok") {
		for (const sub of subs) {
			try {
				await processSub(client, url, sub, res.items);
			} catch (e) {
				console.error(`[RSS] ${sub.guildId} ${url}:`, e);
			}
		}
	}

	const data = {
		failures: 0,
		lastError: null,
		lastCheckedAt: now,
		nextCheckAt: new Date(Date.now() + BASE_INTERVAL_MS),
		...(res.status === "ok" ? { etag: res.etag ?? null, lastModified: res.lastModified ?? null } : {}),
	};
	await prisma.rssFeedState.upsert({
		where: { id: url },
		create: { id: url, ...data },
		update: data,
	});
}

async function tick(client: Client) {
	const guilds = await prisma.guilds.findMany({
		where: { rssfeeds: { some: {} } },
		select: { id: true, rssfeeds: true },
	});

	const byUrl = new Map<string, Sub[]>();
	for (const g of guilds)
		for (const feed of g.rssfeeds) {
			if (feed.disabled) continue;
			byUrl.set(feed.id, [...(byUrl.get(feed.id) ?? []), { guildId: g.id, feed }]);
		}
	if (!byUrl.size) return;

	const states = await prisma.rssFeedState.findMany({
		where: { id: { in: [...byUrl.keys()] } },
		select: { id: true, nextCheckAt: true },
	});
	const next = new Map(states.map((s) => [s.id, s.nextCheckAt.getTime()]));
	const due = [...byUrl.entries()].filter(([url]) => (next.get(url) ?? 0) <= Date.now());

	for (let i = 0; i < due.length; i += CONCURRENCY)
		await Promise.all(
			due.slice(i, i + CONCURRENCY).map(([url, subs]) =>
				processUrl(client, url, subs).catch((e) => console.error(`[RSS] ${url}:`, e)),
			),
		);
}

async function prune() {
	await prisma.rssSeenItem.deleteMany({
		where: { createdAt: { lt: new Date(Date.now() - SEEN_TTL_MS) } },
	});
}

let started = false;

export function startRssPoller(client: Client) {
	if (started) return;
	started = true;

	const loop = async () => {
		try {
			await tick(client);
		} catch (e) {
			console.error("[RSS] erro geral:", e);
		} finally {
			setTimeout(loop, TICK_MS);
		}
	};
	loop();

	const pruneLoop = async () => {
		await prune().catch((e) => console.error("[RSS] prune:", e));
		setTimeout(pruneLoop, 86_400_000);
	};
	pruneLoop();
}
