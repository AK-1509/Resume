import { Hero } from "@/components/Hero";
import { ExperienceSection } from "@/components/ExperienceSection";
import { SkillIndex } from "@/components/SkillIndex";
import { Colophon } from "@/components/Colophon";
import { resume, experiencesOfType, indexedSkills } from "@/lib/resume";

/**
 * The page reads as a book: title page, the text, then the back matter — the
 * index of skills, and the colophon.
 */
export default function Home() {
  return (
    <>
      <Hero profile={resume.profile} />

      <main className="shell flex flex-col gap-14 py-14 md:gap-16 md:py-16">
        <ExperienceSection
          id="education"
          heading="Education"
          experiences={experiencesOfType("education")}
          columns={2}
        />

        <div className="grid gap-16 md:grid-cols-2 md:gap-10">
          <ExperienceSection
            id="experience"
            heading="Experience"
            experiences={experiencesOfType("work")}
          />
          <ExperienceSection
            id="projects"
            heading="Projects"
            experiences={experiencesOfType("project")}
          />
        </div>

        {/* Back matter: the index, then the colophon. */}
        <div className="flex flex-col gap-10 border-t border-sage pt-12">
          <SkillIndex skills={indexedSkills()} />
          <Colophon languages={resume.languages} />
        </div>
      </main>

      <footer className="shell pb-14">
        <p className="font-sans text-ui text-muted">
          <a
            href={`mailto:${resume.profile.email}`}
            className="text-claret underline underline-offset-4"
          >
            {resume.profile.email}
          </a>
        </p>
      </footer>
    </>
  );
}
