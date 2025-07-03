import settings from "../../settings.json" with { type: "json" };

import "./global.js";
import { logger } from "./logger.js";

export * from "./error.js";

export { settings, logger };
