import { format } from "@lukeed/ms";

export const formatLong = async (ms: number) => {
	return format(ms, true)
		.replace("minutes", "minutos")
		.replace("minute", "minuto")
		.replace("hours", "horas")
		.replace("hour", "hora")
		.replace("seconds", "segundos")
		.replace("second", "segundo")
		.replace("days", "dias")
		.replace("day", "dia");
};
