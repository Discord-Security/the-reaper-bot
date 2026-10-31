import { XMLParser } from "fast-xml-parser";

export interface RssItem {
	key: string;
	title: string;
	link: string;
	creator: string;
	guid: string;
	date: Date;
}

export type FetchResult =
	| { status: "notModified" }
	| { status: "ok"; items: RssItem[]; etag?: string; lastModified?: string }
	| { status: "error"; error: string; retryAfterMs?: number };

const USER_AGENTS = [
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	"Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)",
	"TheReaperBot/2.0 (+https://discord.com)",
];

const xml = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	textNodeName: "#text",
	processEntities: true,
	htmlEntities: true,
	parseTagValue: false,
	parseAttributeValue: false,
	trimValues: true,
});

const arr = <T>(v: T | T[] | undefined): T[] =>
	v === undefined || v === null ? [] : Array.isArray(v) ? v : [v];

const text = (v: unknown): string => {
	if (v === undefined || v === null) return "";
	if (typeof v === "string") return v.trim();
	if (typeof v === "number") return String(v);
	if (typeof v === "object") return text((v as Record<string, unknown>)["#text"]);
	return "";
};

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s: string) =>
	s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
		if (e[0] === "#") {
			const c = e[1].toLowerCase() === "x" ? Number.parseInt(e.slice(2), 16) : Number(e.slice(1));
			return Number.isFinite(c) ? String.fromCodePoint(c) : m;
		}
		return NAMED[e.toLowerCase()] ?? m;
	});

const linkOf = (v: unknown): string => {
	const links = arr(v as unknown[]);
	const pick =
		links.find((l) => typeof l === "object" && (l as any)["@_rel"] === "alternate") ??
		links.find((l) => typeof l === "object" && !(l as any)["@_rel"]) ??
		links[0];
	if (typeof pick === "object" && pick) return text((pick as any)["@_href"]) || text(pick);
	return text(pick);
};

const toItem = (raw: any): RssItem | null => {
	const link = linkOf(raw.link);
	const guid = text(raw.guid) || text(raw.id);
	const dateRaw =
		text(raw.pubDate) || text(raw["dc:date"]) || text(raw.published) || text(raw.updated);
	const parsed = dateRaw ? new Date(dateRaw) : new Date(Number.NaN);
	const key = guid || link;
	if (!key || !link) return null;
	const author = raw["dc:creator"] ?? raw.author;
	return {
		key,
		link,
		guid,
		title: decode(text(raw.title)),
		creator: text(author?.name ?? author),
		date: Number.isNaN(parsed.getTime()) ? new Date() : parsed,
	};
};

export function parseFeed(body: string): RssItem[] {
	const doc = xml.parse(body);
	const rawItems: any[] =
		doc?.rss?.channel
			? arr(doc.rss.channel).flatMap((c: any) => arr(c.item))
			: doc?.feed
				? arr(doc.feed.entry)
				: doc?.["rdf:RDF"]
					? arr(doc["rdf:RDF"].item)
					: [];
	if (!rawItems.length && !doc?.rss && !doc?.feed && !doc?.["rdf:RDF"])
		throw new Error("Not an RSS/Atom feed");
	return rawItems
		.map(toItem)
		.filter((i): i is RssItem => i !== null)
		.sort((a, b) => a.date.getTime() - b.date.getTime());
}

const retryAfter = (res: Response) => {
	const h = res.headers.get("retry-after");
	if (!h) return undefined;
	const s = Number(h);
	if (!Number.isNaN(s)) return s * 1000;
	const d = Date.parse(h);
	return Number.isNaN(d) ? undefined : Math.max(0, d - Date.now());
};

export async function fetchFeed(
	url: string,
	cache: { etag?: string | null; lastModified?: string | null } = {},
): Promise<FetchResult> {
	let last: FetchResult = { status: "error", error: "unknown" };
	for (const ua of USER_AGENTS) {
		try {
			const headers: Record<string, string> = {
				"User-Agent": ua,
				Accept:
					"application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
				"Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
			};
			if (cache.etag) headers["If-None-Match"] = cache.etag;
			if (cache.lastModified) headers["If-Modified-Since"] = cache.lastModified;
			const res = await fetch(url, {
				headers,
				redirect: "follow",
				signal: AbortSignal.timeout(20_000),
			});
			if (res.status === 304) return { status: "notModified" };
			if (res.ok) {
				const items = parseFeed(await res.text());
				return {
					status: "ok",
					items,
					etag: res.headers.get("etag") ?? undefined,
					lastModified: res.headers.get("last-modified") ?? undefined,
				};
			}
			last = {
				status: "error",
				error: `HTTP ${res.status}`,
				retryAfterMs: retryAfter(res),
			};
			if (![401, 403, 406, 429, 503].includes(res.status)) return last;
		} catch (e) {
			last = { status: "error", error: e instanceof Error ? e.message : String(e) };
		}
	}
	return last;
}
