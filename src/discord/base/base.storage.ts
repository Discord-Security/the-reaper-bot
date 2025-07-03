/** DO NOT CHANGE THIS FILE */
import { Collection } from "discord.js";
import { createRouter } from "rou3";
import type { BaseStorage } from "./base.types.js";

export const baseStorage: BaseStorage = {
	commands: new Collection(),
	events: new Collection(),
	responders: createRouter(),
	config: {
		commands: {
			guilds: [],
		},
		responders: {},
		events: {},
	},
	loadLogs: {
		commands: [],
		responders: [],
		events: [],
	},
};
/** DO NOT CHANGE THIS FILE */
