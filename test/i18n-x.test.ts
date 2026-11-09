import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import ts from "typescript";
import { CATALOG, makeX } from "@/i18n/x";
import { SERVER, translateServer } from "@/i18n/server-text";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|mts)$/.test(p) ? [p] : [];
  });
}

/** Every x("...") / T("...") literal in the source. */
function used(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  for (const file of files("src")) {
    if (file.includes("src/i18n/x/")) continue;
    const src = readFileSync(file, "utf8");
    if (!/\b[xT]\(/.test(src)) continue;
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === "x" || n.expression.text === "T")) {
        const a = n.arguments[0];
        if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) out.push({ file, text: a.text });
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
}
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

describe("inner-page translations (x)", () => {
  const all = used();
  it("every x()/T() text has kaa, en and ru with the same {placeholders}", () => {
    const problems: string[] = [];
    for (const { file, text } of all) {
      const e = CATALOG[text];
      if (!e) {
        problems.push(`${file}: no translation for "${text}"`);
        continue;
      }
      for (const l of ["kaa", "en", "ru"] as const) {
        if (!e[l]?.trim()) problems.push(`${file}: empty ${l} for "${text}"`);
        else if (vars(e[l]) !== vars(text)) problems.push(`${file}: {placeholders} differ in ${l} for "${text}"`);
      }
    }
    expect(problems).toEqual([]);
  });
  it("the catalog has no entry that nothing uses (dead text)", () => {
    const keys = new Set(all.map((a) => a.text));
    expect(Object.keys(CATALOG).filter((k) => !keys.has(k))).toEqual([]);
  });
  it("Uzbek is the source text, other languages translate, unknown text passes through", () => {
    expect(makeX("uz")("Saqlanmadi")).toBe("Saqlanmadi");
    expect(makeX("en")("Saqlanmadi")).toBe("Not saved");
    expect(makeX("ru")('Sinov: "{c}" ga yozildi (#{n})', { c: "orders", n: 5 })).toBe("Проба: записано в «orders» (№5)");
    expect(makeX("kaa")("Hech qanday matn")).toBe("Hech qanday matn");
  });
});

describe("server messages (translateServer)", () => {
  // every Uzbek message written in fail() / new HttpError() under src/app/api and src/lib/server needs an entry
  const norm = (s: string) => s.replace(/\$\{[^}]*\}/g, "{}").replace(/\{\w+\}/g, "{}");
  function messages(): { file: string; text: string }[] {
    const out: { file: string; text: string }[] = [];
    for (const file of [...files("src/app/api"), ...files("src/lib/server")]) {
      const src = readFileSync(file, "utf8");
      const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const visit = (n: ts.Node) => {
        const isFail = ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "fail";
        const isErr = ts.isNewExpression(n) && ts.isIdentifier(n.expression) && ["HttpError", "AiError"].includes(n.expression.text);
        const a = (isFail || isErr) && (n as ts.CallExpression).arguments?.[0];
        if (a) {
          if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) out.push({ file, text: a.text });
          else if (ts.isTemplateExpression(a)) out.push({ file, text: a.getText().slice(1, -1) });
          else if (ts.isBinaryExpression(a) && a.operatorToken.kind === ts.SyntaxKind.PlusToken && ts.isStringLiteral(a.left)) out.push({ file, text: a.left.text + "${}" });
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    return out;
  }
  const have = new Map(Object.keys(SERVER).map((k) => [norm(k), k]));
  it("every message sent by the server has kaa, en and ru", () => {
    const problems: string[] = [];
    for (const { file, text } of messages()) {
      if (/^(AI xatosi|Server xatosi)$/.test(text) || /^[\x00-\x7f]*$/.test(text) && !/ (yo'q|kerak|noto)/i.test(text)) {
        // plain English/technical text: nothing to translate (the two above are in the catalog anyway)
        if (!have.has(norm(text))) continue;
      }
      const key = have.get(norm(text));
      if (!key) problems.push(`${file}: no translation for server message "${text}"`);
      else for (const l of ["kaa", "en", "ru"] as const) if (!SERVER[key][l]?.trim()) problems.push(`${file}: empty ${l} for "${text}"`);
    }
    expect(problems).toEqual([]);
  });
  it("translateServer: exact, with {placeholders}, unknown stays", () => {
    expect(translateServer("en", "Topilmadi")).toBe("Not found");
    expect(translateServer("ru", "Noto'g'ri maydon nomi: price")).toBe("Неверное имя поля: price");
    expect(translateServer("kaa", "Bot token ishlamadi: 401 Unauthorized")).toBe("Bot token islemedi: 401 Unauthorized");
    expect(translateServer("en", "Something new")).toBe("Something new");
    expect(translateServer("uz", "Topilmadi")).toBe("Topilmadi");
  });
});
