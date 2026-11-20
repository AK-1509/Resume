import type { ComponentType } from "react";
import type { LiveMockup } from "@/lib/schema";
import { TunityJourney } from "./TunityJourney";

/** The component behind each `hero.live` id. A new id goes in LIVE_MOCKUPS in lib/schema.ts too. */
export const LIVE_MOCKUPS: Record<LiveMockup, ComponentType> = {
  "tunity-journey": TunityJourney,
};
