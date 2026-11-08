"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkle, Translate } from "@phosphor-icons/react";

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

  function type(text: string) {
    if (timer.current) clearInterval(timer.current);
    let i = 0;
    setValue("");
    timer.current = setInterval(() => {
      setValue(text.slice(0, ++i));
      if (i >= text.length && timer.current) clearInterval(timer.current);
    }, 18);
    area.current?.focus();
  }

  return (
    <>
      <form
        className="prompt"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(href);
        }}
      >
        <textarea ref={area} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
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
