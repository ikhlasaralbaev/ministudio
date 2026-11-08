import { describe, expect, it } from "vitest";
import { appLang } from "@/lib/lang";
import { evaluate, interpolate } from "@/lib/expr";
import { GENERATE_SYSTEM, EDIT_SYSTEM } from "@/lib/spec";

describe("two-language apps", () => {
  it("the person's own switch wins, then Telegram's language, default Uzbek", () => {
    expect(appLang("ru", "uz")).toBe("ru");
    expect(appLang("uz", "ru")).toBe("uz");
    expect(appLang(undefined, "ru")).toBe("ru");
    expect(appLang(undefined, "ru-RU")).toBe("ru");
    expect(appLang(undefined, "en")).toBe("uz");
    expect(appLang(undefined, undefined)).toBe("uz");
    expect(appLang("de", "")).toBe("uz");
  });
  it("texts switch with {{ lang == 'ru' ? ... }} and the switch button's setState value is a valid expression", () => {
    const text = "{{ lang == 'ru' ? 'Меню' : 'Menyu' }}";
    expect(interpolate(text, { lang: "ru" })).toBe("Меню");
    expect(interpolate(text, { lang: "uz" })).toBe("Menyu");
    expect(interpolate("{{ lang == 'ru' ? item.name_ru : item.name }}", { lang: "ru", item: { name: "Osh", name_ru: "Плов" } })).toBe("Плов");
    expect(evaluate("'ru'", {})).toBe("ru");
  });
  it("the AI is told how (generate and edit prompts)", () => {
    for (const s of [GENERATE_SYSTEM, EDIT_SYSTEM]) expect(s).toContain("TWO LANGUAGES");
  });
});
