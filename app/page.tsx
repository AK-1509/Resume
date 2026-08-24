import Link from "next/link";
import { resume, experiencesOfType } from "@/lib/resume";
import { endorsementCounts } from "@/lib/schema";

/**
 * Phase 1 placeholder. Confirms that content/resume.json parses through the
 * schema and that the tokens and fonts are wired up. The real layout lands in
 * Phase 3 once the design plan is approved.
 */
export default function Home() {
  const counts = endorsementCounts(resume);
  const sections = [
    { type: "education" as const, label: "Education" },
    { type: "work" as const, label: "Experience" },
    { type: "project" as const, label: "Projects" },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="metadata text-muted">Phase 1 — foundation</p>
      <h1 className="mt-3 font-serif text-section font-medium">{resume.profile.name}</h1>
      <p className="mt-2 max-w-[65ch] font-sans text-body text-muted">{resume.profile.headline}</p>

      <p className="mt-8 font-sans text-body">
        Content parses, tokens are live, fonts are self-hosted.{" "}
        <Link href="/specimen" className="text-claret underline underline-offset-4">
          View the type and colour specimen
        </Link>
        .
      </p>

      <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3">
        {sections.map(({ type, label }) => (
          <div key={type}>
            <dt className="metadata text-muted">{label}</dt>
            <dd className="font-mono text-body tabular-nums">{experiencesOfType(type).length}</dd>
          </div>
        ))}
        <div>
          <dt className="metadata text-muted">Skills endorsed</dt>
          <dd className="font-mono text-body tabular-nums">
            {[...counts.values()].filter((n) => n > 0).length} / {resume.skills.length}
          </dd>
        </div>
      </dl>
    </main>
  );
}
