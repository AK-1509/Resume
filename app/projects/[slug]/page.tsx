import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudyPage } from "@/components/case/CaseStudyPage";
import { caseStudies, caseStudy, caseStudySlugs } from "@/lib/case-studies";
import { resume } from "@/lib/resume";

/**
 * One project page per file in content/case-studies. Every page is
 * prerendered, and a slug with no file is a 404 rather than a render attempt.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return caseStudySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const study = caseStudy(slug);
  if (!study) return {};
  return {
    title: `${study.title} — ${resume.profile.name}`,
    description: study.slugLine,
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = caseStudy(slug);
  if (!study) notFound();

  return (
    <CaseStudyPage
      study={study}
      all={caseStudies().map(({ slug, title, category }) => ({ slug, title, category }))}
      name={resume.profile.name}
      email={resume.profile.email}
    />
  );
}
