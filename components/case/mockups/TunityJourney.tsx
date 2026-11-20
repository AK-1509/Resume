"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent } from "react";

/*
 * The Tunity hero: a phone in shallow 3D space that plays the product's four
 * steps (the page's "How it works" block) as one loop. A creator registers a
 * track, Tunity fingerprints it and timestamps it on-chain, the creator sets
 * its AI terms, an AI company licenses it and the royalty pays out, and the
 * track joins their protected works.
 *
 * The screen is a picture, not an interface: it is aria-hidden and takes no
 * focus, and the figcaption tells the same story in words. The one control is
 * the pause button, which WCAG 2.2.2 asks of anything that moves for more
 * than five seconds. The loop also rests off screen and in a hidden tab, and
 * waits for a press of Play under reduced motion.
 *
 * Titles and kinds of work come from the concept mockup (concept-app.webp);
 * the 80% share is the page's own term. No money figures are shown.
 */

type Scene = "home" | "register" | "terms" | "paid";

const BEATS = [
  { id: "portfolio", scene: "home", ms: 2400 },
  { id: "tap-register", scene: "home", ms: 650 },
  { id: "upload", scene: "register", ms: 950 },
  { id: "fingerprint", scene: "register", ms: 1700 },
  { id: "timestamp", scene: "register", ms: 1300 },
  { id: "verified", scene: "register", ms: 1500 },
  { id: "terms", scene: "terms", ms: 1100 },
  { id: "choose", scene: "terms", ms: 1300 },
  { id: "publish", scene: "terms", ms: 750 },
  { id: "dashboard", scene: "paid", ms: 1000 },
  { id: "paid", scene: "paid", ms: 2700 },
  { id: "portfolio-after", scene: "home", ms: 3000 },
  // A blink between loops, so the new row and the count never run backwards on screen.
  { id: "reset", scene: null, ms: 320 },
] as const satisfies readonly { id: string; scene: Scene | null; ms: number }[];

type BeatId = (typeof BEATS)[number]["id"];

const SCENES: Scene[] = ["home", "register", "terms", "paid"];
const BEAT_INDEX = Object.fromEntries(BEATS.map((b, i) => [b.id, i])) as Record<BeatId, number>;

// A fixed waveform, so the server and the browser draw the same bars.
const WAVE = Array.from({ length: 34 }, (_, i) =>
  Number((0.22 + 0.78 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45 + 0.3))).toFixed(2)),
);
const USES = [0.32, 0.46, 0.4, 0.62, 0.55, 0.78, 1];
const EDGES = [1, 2, 3, 4, 5, 6];

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const on = (value: boolean) => (value ? "true" : "false");
const vars = (v: Record<string, string | number>) => v as CSSProperties;

export function TunityJourney() {
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
  // null until the reader chooses; then their choice wins over the default.
  const [choice, setChoice] = useState<boolean | null>(null);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [beat, setBeat] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const wantsPlay = choice ?? !reduced;
  const playing = wantsPlay && inView && pageVisible;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => setBeat((b) => (b + 1) % BEATS.length), BEATS[beat].ms);
    return () => window.clearTimeout(id);
  }, [playing, beat]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(root);
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // The lean follows a mouse only, and never under reduced motion. It writes
  // two custom properties straight to the stage, so moving the pointer never
  // re-renders the screen.
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage || e.pointerType !== "mouse" || window.matchMedia(REDUCED).matches) return;
    const box = stage.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 2 - 1;
    const y = ((e.clientY - box.top) / box.height) * 2 - 1;
    stage.style.setProperty("--tx", Math.max(-1, Math.min(1, x)).toFixed(3));
    stage.style.setProperty("--ty", Math.max(-1, Math.min(1, y)).toFixed(3));
    stage.dataset.hover = "true";
  };
  const onPointerLeave = () => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.removeProperty("--tx");
    stage.style.removeProperty("--ty");
    delete stage.dataset.hover;
  };

  const now = BEATS[beat];
  const at = (id: BeatId) => beat >= BEAT_INDEX[id];
  const is = (id: BeatId) => now.id === id;
  const state = (scene: Scene) => {
    if (now.scene === null) return scene === "home" ? "off" : "after";
    if (scene === now.scene) return "on";
    return SCENES.indexOf(scene) < SCENES.indexOf(now.scene) ? "before" : "after";
  };
  const fresh = at("portfolio-after");

  return (
    <figure ref={rootRef} className="tj" data-paused={on(!playing)}>
      <div ref={stageRef} className="tj-stage" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
        <div className="tj-enter">
          <div className="tj-tilt">
            <div className="tj-phone" aria-hidden="true">
              <span className="tj-shadow" />
              {EDGES.map((i) => (
                <span key={i} className="tj-edge" style={vars({ "--i": i })} />
              ))}
              <div className="tj-frame">
                <div className="tj-screen">
                  <div className="tj-status">
                    <span className="tj-status__time">9:41</span>
                    <span className="tj-island" />
                    <span className="tj-status__icons">
                      <SignalIcon />
                      <BatteryIcon />
                    </span>
                  </div>

                  {/* 1 and 5. The portfolio, before and after. */}
                  <div className="tj-scene tj-home" data-state={state("home")}>
                    <div className="tj-head">
                      <span className="tj-h1">My Creations</span>
                      <span className="tj-avatar" />
                      <span className="tj-bell">
                        <BellIcon />
                      </span>
                    </div>
                    <div className="tj-chips">
                      <span className="is-on">All</span>
                      <span>Music</span>
                      <span>Visual</span>
                      <span>Video</span>
                    </div>
                    <div className="tj-summary">
                      <span className="tj-layers">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span>
                        <span className="tj-summary__count">
                          <span className="tj-roll" data-on={on(fresh)}>
                            <span>12</span>
                            <span>13</span>
                          </span>{" "}
                          Protected Works
                        </span>
                        <span className="tj-muted">Ownership secured</span>
                      </span>
                      <ChevronIcon />
                    </div>
                    <div className="tj-list">
                      <div className="tj-row-wrap" data-on={on(fresh)}>
                        <div className="tj-row tj-row--new">
                          <span className="tj-art tj-art--echoes" />
                          <span className="tj-row__text">
                            <span className="tj-row__title">Midnight Echoes</span>
                            <span className="tj-muted">Music · track + 4 stems</span>
                          </span>
                          <span className="tj-badge tj-badge--licensed">AI licensed</span>
                        </div>
                      </div>
                      <Row art="quiet" title="Golden Quiet" kind="Digital painting" />
                      <Row art="road" title="The Long Road" kind="Video" />
                      <Row art="alpine" title="Alpine Reflections" kind="Photography" />
                    </div>
                    <div className="tj-cta tj-cta--home" data-tap={on(is("tap-register"))}>
                      <PlusIcon /> Register Creation
                      <span className="tj-tap" />
                    </div>
                    <div className="tj-tabs">
                      <span className="is-on">
                        <GridIcon />
                        Portfolio
                      </span>
                      <span>
                        <PlusCircleIcon />
                        Register
                      </span>
                      <span>
                        <ShieldIcon />
                        Claims
                      </span>
                      <span>
                        <PersonIcon />
                        Profile
                      </span>
                    </div>
                  </div>

                  {/* 2. Register: fingerprint and on-chain timestamp. */}
                  <div className="tj-scene tj-register" data-state={state("register")}>
                    <TopBar title="Register Creation" />
                    <span className="tj-step">Step 1 of 2</span>
                    <span className="tj-h2">Prove it’s yours</span>
                    <div className="tj-card tj-file" data-on={on(at("upload"))}>
                      <span className="tj-icon">
                        <NoteIcon />
                      </span>
                      <span className="tj-row__text">
                        <span className="tj-row__title">Midnight Echoes.wav</span>
                        <span className="tj-muted">Track + 4 stems</span>
                      </span>
                      <span className="tj-progress">
                        <i />
                      </span>
                    </div>
                    <div
                      className="tj-card tj-wave"
                      data-on={on(at("fingerprint"))}
                      data-scan={on(is("fingerprint"))}
                      data-done={on(at("timestamp"))}
                    >
                      <span className="tj-label">
                        <FingerprintIcon />
                        {at("timestamp") ? "Audio fingerprint created" : "Fingerprinting audio…"}
                      </span>
                      <span className="tj-wave__bars">
                        <span className="tj-wave__base">
                          {WAVE.map((h, i) => (
                            <i key={i} style={vars({ "--h": h })} />
                          ))}
                        </span>
                        <span className="tj-wave__fill">
                          {WAVE.map((h, i) => (
                            <i key={i} style={vars({ "--h": h })} />
                          ))}
                        </span>
                        <span className="tj-wave__scan" />
                      </span>
                    </div>
                    <div className="tj-card tj-chain" data-on={on(at("timestamp"))} data-done={on(at("verified"))}>
                      <span className="tj-icon">
                        <LinkIcon />
                      </span>
                      <span className="tj-row__text">
                        <span className="tj-row__title">
                          {at("verified") ? "Timestamp recorded" : "Timestamping on-chain…"}
                        </span>
                        <span className="tj-mono">0x7A…91C</span>
                      </span>
                      <span className="tj-blocks">
                        <i />
                        <i />
                        <i />
                      </span>
                    </div>
                    <div className="tj-verified" data-on={on(at("verified"))}>
                      <ShieldCheckIcon />
                      <span className="tj-row__text">
                        <span className="tj-row__title">Fingerprint verified</span>
                        <span>Ownership recorded on-chain</span>
                      </span>
                    </div>
                  </div>

                  {/* 3. Set terms, per track or stem. */}
                  <div className="tj-scene tj-terms" data-state={state("terms")}>
                    <TopBar title="Set AI Terms" />
                    <span className="tj-step">Step 2 of 2</span>
                    <span className="tj-h2">How may AI use it?</span>
                    <div className="tj-options">
                      <Option title="No AI use" note="Block training and sampling" />
                      <Option
                        title="License for training"
                        note="Paid per use · 80% to you"
                        selected={at("choose")}
                        tap={is("choose")}
                      />
                      <Option title="Sample with credit" note="Credit required on release" />
                    </div>
                    <span className="tj-step">Applies to</span>
                    <div className="tj-stems">
                      {["Full track", "Vocals", "Drums", "Bass", "Keys"].map((s) => (
                        <span key={s}>
                          <CheckIcon />
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="tj-cta tj-cta--terms" data-tap={on(is("publish"))} data-ready={on(at("choose"))}>
                      Publish terms
                      <span className="tj-tap" />
                    </div>
                  </div>

                  {/* 4. Licensed and paid. */}
                  <div className="tj-scene tj-paid" data-state={state("paid")}>
                    <TopBar title="Usage" />
                    <span className="tj-step">Midnight Echoes</span>
                    <div className="tj-royalty" data-on={on(at("paid"))}>
                      <span className="tj-royalty__label">
                        {at("paid") ? "Royalty paid automatically" : "Listed for AI training"}
                      </span>
                      <span className="tj-royalty__share">80%</span>
                      <span className="tj-royalty__note">of every license fee goes to you</span>
                      <span className="tj-royalty__settled">
                        <CheckIcon />
                        Smart contract settled
                      </span>
                    </div>
                    <div className="tj-card tj-uses" data-on={on(at("dashboard"))} data-paid={on(at("paid"))}>
                      <span className="tj-row__title">AI training uses</span>
                      <span className="tj-uses__bars">
                        {USES.map((h, i) => (
                          <i key={i} style={vars({ "--h": h, "--i": i })} />
                        ))}
                      </span>
                    </div>
                    <div className="tj-card tj-alerts">
                      <span className="tj-icon tj-icon--green">
                        <ShieldCheckIcon />
                      </span>
                      <span className="tj-row__text">
                        <span className="tj-row__title">Misuse alerts</span>
                        <span className="tj-muted">None found</span>
                      </span>
                    </div>
                  </div>

                  <span className="tj-home-bar" />
                </div>
              </div>
              <span className="tj-glare" />
              {/* The notification floats off the glass, so it rides above the screen when the phone leans. */}
              <div className="tj-float" data-on={on(is("paid"))}>
                <div className="tj-note">
                  <span className="tj-note__app">T</span>
                  <span className="tj-row__text">
                    <span className="tj-note__head">
                      <b>New AI license</b>
                      <span>now</span>
                    </span>
                    <span>Midnight Echoes was licensed for training. Your royalty is paid.</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        Concept mockup of the Tunity app, playing a short loop. A creator taps Register Creation and uploads the track
        Midnight Echoes with four stems. Tunity fingerprints the audio and timestamps it on-chain, and the fingerprint is
        verified. The creator chooses to license the track for AI training, with 80% of each license fee going to them,
        and publishes the terms. An AI company licenses it, the smart contract settles and the royalty is paid
        automatically. The track then joins the creator’s 13 protected works.
      </figcaption>
      <button
        type="button"
        className="druid-button druid-button--quiet tj-control"
        onClick={() => setChoice(!wantsPlay)}
      >
        {wantsPlay ? <PauseIcon /> : <PlayIcon />}
        {wantsPlay ? "Pause demo" : "Play demo"}
      </button>
    </figure>
  );
}

function Row({ art, title, kind }: { art: string; title: string; kind: string }) {
  return (
    <div className="tj-row">
      <span className={`tj-art tj-art--${art}`} />
      <span className="tj-row__text">
        <span className="tj-row__title">{title}</span>
        <span className="tj-muted">{kind}</span>
      </span>
      <span className="tj-badge">
        <ShieldCheckIcon />
        Protected
      </span>
    </div>
  );
}

function Option({ title, note, selected = false, tap = false }: { title: string; note: string; selected?: boolean; tap?: boolean }) {
  return (
    <div className="tj-option" data-selected={on(selected)} data-tap={on(tap)}>
      <span className="tj-radio" />
      <span className="tj-row__text">
        <span className="tj-row__title">{title}</span>
        <span className="tj-muted">{note}</span>
      </span>
      <span className="tj-tap" />
    </div>
  );
}

function TopBar({ title }: { title: string }) {
  return (
    <div className="tj-bar">
      <BackIcon />
      <span>{title}</span>
    </div>
  );
}

/* Icons: 24px grids, stroked in currentColor. */
const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function PauseIcon() {
  return (
    <svg {...stroke} aria-hidden="true">
      <path d="M9 5v14M15 5v14" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg {...stroke} aria-hidden="true">
      <path d="M7 5l12 7-12 7z" />
    </svg>
  );
}
function SignalIcon() {
  return (
    <svg viewBox="0 0 18 12" fill="currentColor">
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
      <rect x="10" y="3" width="3" height="9" rx="1" />
      <rect x="15" y="0" width="3" height="12" rx="1" />
    </svg>
  );
}
function BatteryIcon() {
  return (
    <svg viewBox="0 0 26 12" fill="none">
      <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity="0.45" />
      <rect x="2" y="2" width="17" height="8" rx="1.8" fill="currentColor" />
      <path d="M24.5 4v4" stroke="currentColor" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg {...stroke}>
      <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg {...stroke} className="tj-chev">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg {...stroke}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg {...stroke}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function PlusCircleIcon() {
  return (
    <svg {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg {...stroke}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M4 16l5-5 4 4 2-2 5 5" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg {...stroke}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
    </svg>
  );
}
function ShieldCheckIcon() {
  return (
    <svg {...stroke}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg {...stroke}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg {...stroke}>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  );
}
function FingerprintIcon() {
  return (
    <svg {...stroke}>
      <path d="M12 11v4M8.5 7.5A5 5 0 0 1 17 11v2M7 11a5 5 0 0 0 0 0v3a8 8 0 0 0 1.5 4.5M12 19a6 6 0 0 0 2-4M5 8a8.5 8.5 0 0 1 14.5 1" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg {...stroke}>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg {...stroke}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
