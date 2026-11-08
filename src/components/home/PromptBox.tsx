"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkle, Translate } from "@phosphor-icons/react";
import { ideaDraftScript, saveIdeaDraft } from "@/lib/draft";

export interface Chip {
  label: string;
  text: string;
  icon: React.ReactNode;
}

/** Hero prompt box. Example chips type their text in; submitting continues to sign-in (or the dashboard). */
export function PromptBox({
  placeholder,
  create,
  chips,
  href,
  langName,
}: {
  placeholder: string;
  create: string;
  chips: Chip[];
  href: string;
  langName: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  // keep the idea while the visitor signs in (any of the sign-in buttons), the dashboard picks it up
  const update = (v: string) => {
    setValue(v);
    saveIdeaDraft(v);
  };

  function type(text: string) {
    if (timer.current) clearInterval(timer.current);
    let i = 0;
    setValue("");
    timer.current = setInterval(() => {
      const part = text.slice(0, ++i);
      setValue(part);
      if (i >= text.length) {
        saveIdeaDraft(text);
        if (timer.current) clearInterval(timer.current);
      }
    }, 18);
    area.current?.focus();
  }

  return (
    <>
      {/* typed before the page finished hydrating? this keeps it (the field has no name: nothing goes into the URL) */}
      <script dangerouslySetInnerHTML={{ __html: ideaDraftScript(".prompt textarea") }} />
      <form
        className="prompt"
        action={href}
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          saveIdeaDraft(value);
          router.push(href);
        }}
      >
        <textarea ref={area} value={value} onChange={(e) => update(e.target.value)} placeholder={placeholder} />
        <div className="pb">
          <span className="tg">
            <Sparkle weight="fill" /> Sonnet 5.5
          </span>
          <span className="tg">
            <Translate weight="bold" /> {langName}
          </span>
          <button className="btn g" type="submit">
            {create}
            <ArrowRight weight="bold" />
          </button>
        </div>
      </form>
      <div className="ex">
        {chips.map((c) => (
          <button key={c.label} type="button" onClick={() => type(c.text)}>
            {c.icon}
            {c.label}
          </button>
        ))}
      </div>
    </>
  );
}
