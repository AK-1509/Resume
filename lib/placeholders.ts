/**
 * Labelled placeholders ("VVP placeholder", "Placeholder for the role", an
 * empty demo or report slot) are an authoring aid. They show in development,
 * so a missing picture or link is easy to spot while editing, and stay off the
 * live site, where an empty slot simply drops out.
 *
 * `NODE_ENV` is inlined at build time, so this is a constant in both server
 * and client bundles.
 */
export const SHOW_PLACEHOLDERS = process.env.NODE_ENV !== "production";
