import raw from "@/content/resume.json";
import { ResumeSchema, type Resume } from "./schema";

/**
 * Parsed at module load, so a malformed `resume.json` fails the build rather
 * than rendering a broken page. `npm run validate` runs the same schema.
 */
export const resume: Resume = ResumeSchema.parse(raw);
