import { Airport } from "./simulation";
export const browserMode = import.meta.env.VITE_RUNTIME === "browser";
export const simulation = browserMode ? new Airport() : null;
