import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePage, copyFor } from "@/components/HomePage";
import { TRANSLATED_LOCALES, isLocale } from "@/lib/i18n";

/**
 * The portfolio in another language: `/hi` is Hindi. Each locale with a
 * catalog in content/i18n is prerendered; any other first segment is a 404
 * (`/projects` and `/specimen` are their own routes and take precedence).
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return TRANSLATED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { title, description } = copyFor(locale);
  return { title, description, alternates: { languages: { en: "/", [locale]: `/${locale}` } } };
}

export default async function LocalizedHome({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale) || !TRANSLATED_LOCALES.includes(locale)) notFound();
  return <HomePage locale={locale} />;
}
