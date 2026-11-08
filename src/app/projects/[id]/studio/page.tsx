"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { ProjectDTO } from "@/lib/types";
import { Studio } from "@/components/studio/Studio";

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<(ProjectDTO & { envKeys: string[] }) | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api(`/api/projects/${id}`).then(setP).catch((e) => setErr(e.message));
  }, [id]);
  if (err) return <p className="p-10 text-danger">{err}</p>;
  if (!p) return <p className="p-10 text-muted">Yuklanmoqda…</p>;
  return <Studio project={p} />;
}
