import type { CSSProperties, ReactNode } from "react";

/**
 * The two inline marks case-study copy may use: `==text==` for the gold
 * highlighter and `**text**` for bold. They may nest (`**==text==**`).
 *
 * Each highlight carries its position as `--i`, so a paragraph's highlights
 * draw one after another rather than all at once.
 */
export function rich(text: string): ReactNode[] {
  let marks = 0;

  const walk = (source: string, keyBase: string): ReactNode[] => {
    const out: ReactNode[] = [];
    const pattern = /\*\*(.+?)\*\*|==(.+?)==/g;
    let last = 0;
    let n = 0;
    for (let m = pattern.exec(source); m; m = pattern.exec(source)) {
      if (m.index > last) out.push(source.slice(last, m.index));
      const key = `${keyBase}${n++}`;
      if (m[1] !== undefined) {
        out.push(<strong key={key}>{walk(m[1], `${key}-`)}</strong>);
      } else {
        const style = { "--i": marks++ } as CSSProperties;
        out.push(
          <mark key={key} style={style}>
            {walk(m[2], `${key}-`)}
          </mark>,
        );
      }
      last = m.index + m[0].length;
    }
    if (last < source.length) out.push(source.slice(last));
    return out;
  };

  return walk(text, "r");
}
