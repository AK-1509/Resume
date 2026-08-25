"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  CONTENT_HEIGHT_PX,
  DENSITY_LADDER,
  overflowAdvice,
  type Density,
  type FitResult,
  type PrintModel,
} from "@/lib/export";

/**
 * Bounded auto-fit with a hard floor and an honest failure.
 *
 * Renders the print layout off-screen at exact page geometry, measures
 * scrollHeight, and steps down the density ladder until it fits. It does not
 * scale until it fits: below the floor it stops and reports what to cut.
 *
 * The measurement runs in a layout effect so the caller never paints a preview
 * at a density that has already been ruled out.
 */
export function useAutoFit(
  model: PrintModel,
  /**
   * Measuring only means anything while the node is laid out. A hidden node
   * reports scrollHeight 0, which would silently pass everything at step 0.
   */
  enabled: boolean,
): {
  measureRef: React.RefObject<HTMLDivElement | null>;
  measuringDensity: Density;
  result: FitResult | null;
} {
  const measureRef = useRef<HTMLDivElement>(null);
  const [stepUnderTest, setStepUnderTest] = useState(0);
  const [result, setResult] = useState<FitResult | null>(null);

  // Any change to what is being printed restarts the ladder from the top, so
  // removing content can win back a larger size rather than staying shrunk.
  // Re-opening restarts it too, since nothing was measurable while closed.
  const signature = JSON.stringify({
    enabled,
    groups: model.groups.map((g) => [g.heading, g.entries.map((e) => e.id)]),
    skills: model.skills.map((s) => s.id),
    languages: model.languages,
  });
  const [lastSignature, setLastSignature] = useState(signature);
  if (lastSignature !== signature) {
    setLastSignature(signature);
    setStepUnderTest(0);
    setResult(null);
  }

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node || !enabled) return;

    // A zero height means the node is not laid out, not that it fits.
    if (node.scrollHeight === 0) return;

    const density = DENSITY_LADDER[stepUnderTest];
    const heightPx = node.scrollHeight;

    if (heightPx <= CONTENT_HEIGHT_PX) {
      setResult({ fits: true, density, heightPx });
      return;
    }

    const isFloor = stepUnderTest === DENSITY_LADDER.length - 1;
    if (!isFloor) {
      setStepUnderTest(stepUnderTest + 1);
      return;
    }

    const overflowPx = heightPx - CONTENT_HEIGHT_PX;
    setResult({
      fits: false,
      density,
      heightPx,
      overflowPx,
      advice: overflowAdvice(overflowPx, density, model),
    });
    // `model` is captured through `signature`, which resets the ladder above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepUnderTest, signature, enabled]);

  return {
    measureRef,
    measuringDensity: DENSITY_LADDER[stepUnderTest],
    result,
  };
}
