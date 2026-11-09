"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { ProjectDTO } from "@/lib/types";
import { Studio } from "@/components/studio/Studio";
import { BuildingScreen } from "@/components/BuildingScreen";
import { isBuilding } from "@/lib/building";
import { useX } from "@/i18n/client";

export default function StudioPage() {
  const x = useX();
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<(ProjectDTO & { envKeys: string[] }) | null>(null);
  const [err, setErr] = useState("");
  // null until we know (the flag lives in the browser): nothing is drawn for that first frame instead of flashing text
  const [building, setBuilding] = useState<boolean | null>(null);
  useEffect(() => setBuilding(isBuilding()), []);
  useEffect(() => {
    api(`/api/projects/${id}`).then(setP).catch((e) => setErr(e.message));
  }, [id]);
  if (err) return <p className="p-10 text-danger">{err}</p>;
  if (!p) return building ? <BuildingScreen fullscreen /> : building === false ? <p className="p-10 text-muted">{x("Yuklanmoqda…")}</p> : null;
  return <Studio project={p} />;
}
