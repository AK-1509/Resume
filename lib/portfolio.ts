import raw from "@/content/portfolio.json";
import { PortfolioSchema, type Portfolio } from "./schema";

/** The hero's copy, parsed at module load so a bad file fails the build. */
export const portfolio: Portfolio = PortfolioSchema.parse(raw);
