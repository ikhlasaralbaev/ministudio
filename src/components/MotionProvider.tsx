"use client";
import { MotionConfig } from "motion/react";

/** Every animation made with `motion` honors the system's "reduce motion" setting (transforms become plain fades). */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
