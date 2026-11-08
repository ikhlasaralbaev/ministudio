/**
 * Named springs. Apple's defaults: critically damped (no overshoot) for almost everything, a little bounce only
 * where the gesture itself carried momentum. "duration" is the response time, not a fixed length: a spring settles
 * from wherever it is, so an interrupted animation never jumps.
 */
export const SPRING = {
  /** the default: entering sheets, menus, layout changes */
  smooth: { type: "spring", bounce: 0, duration: 0.4 },
  /** small, quick things: toggles, thumbs, chips */
  snappy: { type: "spring", bounce: 0, duration: 0.28 },
  /** momentum interactions (a flick, a throw) */
  bouncy: { type: "spring", bounce: 0.2, duration: 0.45 },
} as const;
