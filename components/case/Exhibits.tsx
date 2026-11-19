import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Exhibit, Party } from "@/lib/schema";

/** A CSS custom property on an element, typed. */
const vars = (v: Record<string, string | number>) => v as CSSProperties;

type Of<T extends Exhibit["type"]> = Extract<Exhibit, { type: T }>;

const MARKS = { yes: "Yes", partial: "Partial", no: "No" } as const;
type MarkValue = keyof typeof MARKS;
const isMark = (cell: string): cell is MarkValue => cell in MARKS;

/** Full, half or empty: the shape carries the answer and the word backs it. */
function Mark({ value, labelled = true }: { value: MarkValue; labelled?: boolean }) {
  return (
    <span className={`cs-mark cs-mark--${value}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {value === "yes" && <circle cx="8" cy="8" r="6.25" fill="currentColor" />}
        {value === "partial" && <path d="M8 1.75a6.25 6.25 0 0 0 0 12.5z" fill="currentColor" />}
      </svg>
      {labelled && <span className="sr-only">{MARKS[value]}</span>}
    </span>
  );
}

function Steps({ block }: { block: Of<"steps"> }) {
  return (
    <ol className="cs-steps">
      {block.items.map((step, i) => (
        <li key={step.title}>
          <span className="cs-disc" aria-hidden="true">
            {i + 1}
          </span>
          <h4 className="cs-step__title">{step.title}</h4>
          {step.body && <p className="cs-step__body">{step.body}</p>}
        </li>
      ))}
    </ol>
  );
}

function PartyCard({ party, hub = false }: { party: Party; hub?: boolean }) {
  const body = (
    <>
      <h4 className="cs-party__name">{party.name}</h4>
      {party.sub && <p className="cs-party__sub">{party.sub}</p>}
      {party.items.length > 0 && (
        <>
          {party.listLabel && <p className="cs-party__label">{party.listLabel}</p>}
          <ul>
            {party.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
  return <div className={`cs-party${hub ? " cs-party--hub" : ""}`}>{body}</div>;
}

function Flow({
  from,
  to,
  label,
  order,
  back = false,
}: {
  from: string;
  to: string;
  label: string;
  /** Position in the exchange, which sets when the flow draws and runs. */
  order: number;
  back?: boolean;
}) {
  return (
    <p className={`cs-flow${back ? " cs-flow--back" : ""}`} style={vars({ "--i": order })}>
      <span>
        <span className="sr-only">
          {from} to {to}:{" "}
        </span>
        {label}
      </span>
      <span className="cs-flow__line" aria-hidden="true">
        <span className="cs-flow__track">
          <i />
        </span>
      </span>
    </p>
  );
}

/**
 * Two sides and the product between them. The four flows are numbered in the
 * order the exchange happens: in from the left, out to the right, payment
 * back, and the share returned.
 */
function Exchange({ block }: { block: Of<"exchange"> }) {
  const { left, hub, right, flows } = block;
  return (
    <>
      <div className="cs-xchg" data-draw="">
        <PartyCard party={left} />
        <div className="cs-lane">
          <Flow from={left.name} to={hub.name} label={flows.leftToHub} order={0} />
          <Flow from={hub.name} to={left.name} label={flows.hubToLeft} order={3} back />
        </div>
        <PartyCard party={hub} hub />
        <div className="cs-lane">
          <Flow from={hub.name} to={right.name} label={flows.hubToRight} order={1} />
          <Flow from={right.name} to={hub.name} label={flows.rightToHub} order={2} back />
        </div>
        <PartyCard party={right} />
      </div>
      {block.caption && <p className="cs-xchg__caption">{block.caption}</p>}
    </>
  );
}

function Statement({ block }: { block: Of<"statement"> }) {
  return (
    <dl className="cs-stmt">
      {block.clauses.map((clause) => (
        <div key={clause.label + clause.text} className="contents">
          <dt>{clause.label}</dt>
          <dd>{clause.text}</dd>
        </div>
      ))}
    </dl>
  );
}

function Points({ block }: { block: Of<"list"> }) {
  return (
    <ul className="cs-points">
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Figure({ block }: { block: Of<"figure"> }) {
  const { image } = block;
  return (
    <figure className="cs-figure">
      <div className="druid-card">
        <div className="cs-face cs-figure__face">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes="(min-width: 960px) 620px, 92vw"
          />
        </div>
      </div>
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}

/** Ring radii for two and three sizes, all standing on the same floor. */
const RADII: Record<number, number[]> = { 2: [150, 88], 3: [150, 100, 56] };
const FLOOR = 312;

function Sizing({ block }: { block: Of<"sizing"> }) {
  const radii = RADII[block.rings.length];
  const tops = radii.map((r) => FLOOR - 2 * r);
  return (
    <div className="cs-sizing" data-draw="">
      {/* The list beside it says the same thing in words, so the drawing is decoration to a screen reader. */}
      <svg className="cs-sizing__rings" viewBox="0 0 320 322" aria-hidden="true">
        {block.rings.map((ring, i) => {
          const r = radii[i];
          const last = i === radii.length - 1;
          // The label sits in the band above the next ring in, or in the middle of the innermost.
          const y = last ? FLOOR - r - 4 : tops[i] + (tops[i + 1] - tops[i]) / 2 - 4;
          return (
            <g key={ring.name} className="cs-ring" style={vars({ "--i": i })}>
              <circle className={`cs-ring--${i}`} cx="160" cy={FLOOR - r} r={r} />
              <text className="cs-ring__name" x="160" y={y} textAnchor="middle">
                {ring.name}
              </text>
              <text className="cs-ring__value" x="160" y={y + 19} textAnchor="middle">
                {ring.value}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="cs-sizing__list">
        {block.rings.map((ring, i) => (
          <li key={ring.name}>
            <span className={`cs-sizing__swatch cs-sizing__swatch--${i}`} aria-hidden="true" />
            <div>
              <span className="cs-sizing__value">{ring.value}</span>
              <span className="cs-sizing__label">
                {ring.name}
                {ring.label && `: ${ring.label}`}
              </span>
              {ring.note && <p className="cs-sizing__note">{ring.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Table({ block }: { block: Of<"table"> }) {
  const marked = block.rows.some((row) => row.cells.some(isMark));
  return (
    <>
      <div className="cs-table-wrap" role="region" aria-label={block.title ?? "Table"} tabIndex={0}>
        <table
          className={`cs-table${block.numeric ? " cs-table--numeric" : ""}`}
          style={vars({ "--cols": block.columns.length })}
        >
          <thead>
            <tr>
              <th scope="col">{block.rowHeader}</th>
              {block.columns.map((column) => (
                <th key={column.label} scope="col" className={column.highlight ? "is-highlight" : undefined}>
                  {column.label}
                  {column.sub && <span className="cs-table__sub">{column.sub}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell, i) => {
                  const classes = [isMark(cell) && "is-mark", block.columns[i]?.highlight && "is-highlight"]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <td key={i} className={classes || undefined}>
                      {isMark(cell) ? <Mark value={cell} /> : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {marked && (
        <ul className="cs-legend">
          <li>
            <Mark value="yes" labelled={false} /> Yes
          </li>
          <li>
            <Mark value="partial" labelled={false} /> Partial or limited
          </li>
          <li>
            <Mark value="no" labelled={false} /> No
          </li>
        </ul>
      )}
    </>
  );
}

function Bars({ block }: { block: Of<"bars"> }) {
  const longest = Math.max(...block.items.map((item) => item.share), 1);
  return (
    <>
      {block.lead && <p className="cs-lead">{block.lead}</p>}
      <ul className="cs-bars" data-draw="">
        {block.items.map((item, i) => (
          <li key={item.label} className={item.muted ? "is-muted" : undefined}>
            <span>{item.label}</span>
            <span className="cs-bars__track" aria-hidden="true">
              <span className="cs-bars__fill" style={vars({ "--len": (item.share / longest) * 100, "--i": i })} />
            </span>
            <span className="cs-bars__value">{item.value}</span>
            <span className="cs-bars__share">{item.share}%</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** One exhibit, under its title if it has one. `id` is the anchor the navigation pane links to. */
/**
 * A cream Content Card for a table, a chart or a diagram, so the exhibit
 * reads as one object on the canvas. Text, lists and statements stay on the
 * canvas itself. It never lifts: it is not a link.
 */
export function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className="druid-card cs-sheet">
      <div className="cs-face cs-sheet__face">{children}</div>
    </div>
  );
}

/** The exhibits drawn as a table, a chart or a diagram, which sit on a Sheet. */
const ON_SHEET = new Set<Exhibit["type"]>(["exchange", "sizing", "table", "bars"]);

/**
 * One exhibit, under its title if it has one. `id` is the anchor the
 * navigation pane links to. A note under the exhibit stays on the canvas.
 */
export function ExhibitBlock({ block, id }: { block: Exhibit; id: string }) {
  const body = (
    <>
      {block.type === "steps" && <Steps block={block} />}
      {block.type === "exchange" && <Exchange block={block} />}
      {block.type === "statement" && <Statement block={block} />}
      {block.type === "list" && <Points block={block} />}
      {block.type === "figure" && <Figure block={block} />}
      {block.type === "sizing" && <Sizing block={block} />}
      {block.type === "table" && <Table block={block} />}
      {block.type === "bars" && <Bars block={block} />}
    </>
  );
  return (
    <div id={id} className="cs-block">
      {block.title && <h3 className="cs-h3">{block.title}</h3>}
      {ON_SHEET.has(block.type) ? <Sheet>{body}</Sheet> : body}
      {"note" in block && block.note && <p className="cs-note">{block.note}</p>}
    </div>
  );
}
