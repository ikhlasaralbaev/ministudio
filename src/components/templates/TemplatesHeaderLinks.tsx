"use client";
import Link from "next/link";
import { useT, useX } from "@/i18n/client";

export function TemplatesHeaderLinks({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const x = useX();
  return signedIn ? (
    <Link href="/dashboard" className="btn btn-sm">
      {t.nav.projects}
    </Link>
  ) : (
    <Link href="/login?next=%2Fdashboard" className="btn btn-sm btn-primary">
      {x("Kirish")}
    </Link>
  );
}
