import { Hero } from "@/components/Hero";
import { ResumeBody } from "@/components/ResumeBody";
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
        <ResumeBody
          profile={resume.profile}
          education={experiencesOfType("education")}
          work={experiencesOfType("work")}
          projects={experiencesOfType("project")}
          skills={resume.skills}
          indexSkills={indexedSkills()}
          languages={resume.languages}
        />
      </main>

      <footer className="shell pb-14">
        <p className="font-sans text-ui text-soft">
          <a
            href={`mailto:${resume.profile.email}`}
            className="text-accent underline underline-offset-4"
          >
            {resume.profile.email}
          </a>
        </p>
      </footer>
    </>
  );
}
