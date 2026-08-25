"use client";

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { SCALE, type Density, type PrintModel } from "@/lib/export";
import { formatDuration } from "@/lib/format";

/**
 * Fonts are self-hosted TTFs under public/fonts. @react-pdf/renderer embeds
 * them, so the text stays vector — selectable and parseable by an ATS, which
 * a rasterised page would not be.
 */
let registered = false;
export function registerPdfFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: "PlexSans",
    fonts: [
      { src: "/fonts/IBMPlexSans-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/IBMPlexSans-SemiBold.ttf", fontWeight: 600 },
    ],
  });
  Font.register({ family: "PlexMono", src: "/fonts/IBMPlexMono-Regular.ttf" });
  Font.register({ family: "Cormorant", src: "/fonts/CormorantGaramond-SemiBold.ttf" });

  // Without this, long unbroken tokens (URLs) can overflow the text box.
  Font.registerHyphenationCallback((word) => [word]);
}

const SEP = "  ·  ";

export function ResumePdf({ model, density }: { model: PrintModel; density: Density }) {
  const body = density.bodyPt;
  const gap = density.sectionGapPt;

  const styles = StyleSheet.create({
    page: {
      paddingTop: 36, // 0.5in at 72dpi
      paddingBottom: 36,
      paddingHorizontal: 36,
      fontFamily: "PlexSans",
      fontSize: body,
      lineHeight: density.leading,
      color: "#000000",
    },
    name: {
      fontFamily: "Cormorant",
      fontSize: body * SCALE.name,
      lineHeight: 1.05,
    },
    contact: {
      fontFamily: "PlexMono",
      fontSize: body * SCALE.meta,
      marginTop: gap * 0.3,
    },
    rule: { borderTopWidth: 1, borderTopColor: "#000000", marginTop: gap * 0.45 },
    section: { marginTop: gap },
    sectionHeading: {
      fontFamily: "PlexMono",
      fontSize: body * SCALE.meta,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: gap * 0.4,
    },
    entryRow: { flexDirection: "row", justifyContent: "space-between" },
    entryTitle: { fontSize: body * SCALE.entryTitle, fontWeight: 600, flexShrink: 1 },
    entryMeta: {
      fontFamily: "PlexMono",
      fontSize: body * SCALE.meta,
      flexShrink: 0,
      marginLeft: 12,
    },
    bullets: { marginTop: gap * 0.25 },
    bulletRow: { flexDirection: "row", marginBottom: 1 },
    bulletMark: { width: 10 },
    label: {
      fontFamily: "PlexMono",
      fontSize: body * SCALE.meta,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
  });

  const contact = [
    model.profile.email,
    model.profile.location,
    ...model.profile.links.map((l) => l.url.replace(/^https?:\/\/(www\.)?/, "")),
  ].join(SEP);

  return (
    <Document
      title={`${model.profile.name} — Resume`}
      author={model.profile.name}
      creator="resume"
      producer="resume"
    >
      <Page size="LETTER" style={styles.page}>
        <View>
          <Text style={styles.name}>{model.profile.name}</Text>
          <Text style={styles.contact}>{contact}</Text>
          <View style={styles.rule} />
        </View>

        {model.groups.map((group) => (
          <View key={group.heading} style={styles.section}>
            <Text style={styles.sectionHeading}>{group.heading}</Text>

            {group.entries.map((entry, i) => (
              // `wrap={false}` keeps an entry's heading and its bullets
              // together, so a heading is never orphaned at the page foot.
              <View
                key={entry.id}
                wrap={false}
                style={{ marginTop: i === 0 ? 0 : gap * 0.55 }}
              >
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>
                    {entry.title}
                    {entry.organization ? (
                      <Text style={{ fontWeight: 400 }}>{`, ${entry.organization}`}</Text>
                    ) : null}
                  </Text>
                  <Text style={styles.entryMeta}>
                    {formatDuration(entry.startDate, entry.endDate)}
                    {entry.location ? SEP + entry.location : ""}
                  </Text>
                </View>

                {entry.responsibilities.length > 0 && (
                  <View style={styles.bullets}>
                    {entry.responsibilities.map((item) => (
                      <View key={item} style={styles.bulletRow}>
                        <Text style={styles.bulletMark}>•</Text>
                        <Text style={{ flex: 1 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        {model.skills.length > 0 && (
          <View style={styles.section}>
            <Text>
              <Text style={styles.label}>Skills{"  "}</Text>
              {model.skills.map((s) => s.label).join(SEP)}
            </Text>
          </View>
        )}

        {model.languages.length > 0 && (
          <View style={{ marginTop: gap * 0.45 }}>
            <Text>
              <Text style={styles.label}>Languages{"  "}</Text>
              {model.languages.join(SEP)}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

// pdfFilename lives in lib/export.ts so the dialog can name the download
// without importing this module and its renderer.
