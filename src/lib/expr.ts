// Safe expression evaluator: parses with jsep, walks the AST with a whitelist.
// No access to globals, prototypes or arbitrary functions.
import jsep from "jsep";
import jsepObject from "@jsep-plugin/object";
import jsepSpread from "@jsep-plugin/spread";

jsep.plugins.register(jsepObject, jsepSpread);

type Scope = Record<string, unknown>;
type AnyNode = jsep.Expression & Record<string, any>;

const FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? 0));
  return isNaN(n) ? 0 : n;
}
function arr(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

export const HELPERS: Record<string, (...a: any[]) => unknown> = {
  sum: (a: unknown, field?: string, qtyField?: string) =>
    arr(a).reduce(
      (s, x) =>
        s +
        (field ? num(x?.[field]) : num(x)) * (qtyField ? num(x?.[qtyField] ?? 1) : 1),
      0,
    ),
  count: (a: unknown) => arr(a).length,
  len: (a: unknown) => (Array.isArray(a) || typeof a === "string" ? a.length : 0),
  fmt: (n: unknown) =>
    Math.round(num(n))
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " "),
  round: (n: unknown, d = 0) => {
    const p = 10 ** num(d);
    return Math.round(num(n) * p) / p;
  },
  includes: (a: unknown, v: unknown) =>
    Array.isArray(a) ? a.includes(v) : String(a ?? "").includes(String(v)),
  find: (a: unknown, field: string, v: unknown) => arr(a).find((x) => x?.[field] === v),
  findIndex: (a: unknown, field: string, v: unknown) =>
    arr(a).findIndex((x) => x?.[field] === v),
  filter: (a: unknown, field: string, v: unknown) => arr(a).filter((x) => x?.[field] === v),
  map: (a: unknown, field: string) => arr(a).map((x) => x?.[field]),
  join: (a: unknown, sep = ", ") => arr(a).join(String(sep)),
  merge: (...objs: unknown[]) =>
    Object.assign({}, ...objs.filter((o) => o && typeof o === "object")),
  without: (a: unknown, i: unknown) => arr(a).filter((_, idx) => idx !== num(i)),
  upper: (s: unknown) => String(s ?? "").toUpperCase(),
  lower: (s: unknown) => String(s ?? "").toLowerCase(),
  str: (v: unknown) => (v == null ? "" : String(v)),
  number: (v: unknown) => num(v),
  now: () => new Date().toISOString(),
  date: (v?: unknown) => new Date(v ? String(v) : Date.now()).toLocaleDateString("uz-UZ"),
  min: (...a: unknown[]) => Math.min(...a.map(num)),
  max: (...a: unknown[]) => Math.max(...a.map(num)),
  empty: (v: unknown) =>
    v == null || v === "" || (Array.isArray(v) && v.length === 0),
};

const cache = new Map<string, AnyNode>();
function parse(src: string): AnyNode {
  let ast = cache.get(src);
  if (!ast) {
    ast = jsep(src) as AnyNode;
    if (cache.size > 2000) cache.clear();
    cache.set(src, ast);
  }
  return ast;
}

function evalNode(n: AnyNode, scope: Scope): unknown {
  switch (n.type) {
    case "Literal":
      return n.value;
    case "Identifier": {
      if (n.name === "undefined") return undefined;
      if (n.name === "null") return null;
      if (n.name === "true") return true;
      if (n.name === "false") return false;
      if (FORBIDDEN.has(n.name)) return undefined;
      return Object.prototype.hasOwnProperty.call(scope, n.name) ? scope[n.name] : undefined;
    }
    case "MemberExpression": {
      const obj = evalNode(n.object, scope) as any;
      if (obj == null) return undefined;
      const key = n.computed ? evalNode(n.property, scope) : n.property.name;
      if (typeof key !== "string" && typeof key !== "number") return undefined;
      if (FORBIDDEN.has(String(key))) return undefined;
      if (key === "length" && (Array.isArray(obj) || typeof obj === "string")) return obj.length;
      return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
    case "UnaryExpression": {
      const v = evalNode(n.argument, scope);
      if (n.operator === "!") return !v;
      if (n.operator === "-") return -num(v);
      if (n.operator === "+") return num(v);
      throw new Error("Operator " + n.operator);
    }
    case "BinaryExpression": {
      if (n.operator === "&&") return evalNode(n.left, scope) && evalNode(n.right, scope);
      if (n.operator === "||") return evalNode(n.left, scope) || evalNode(n.right, scope);
      if (n.operator === "??") return evalNode(n.left, scope) ?? evalNode(n.right, scope);
      const a = evalNode(n.left, scope) as any;
      const b = evalNode(n.right, scope) as any;
      switch (n.operator) {
        case "+":
          return typeof a === "string" || typeof b === "string"
            ? String(a ?? "") + String(b ?? "")
            : num(a) + num(b);
        case "-":
          return num(a) - num(b);
        case "*":
          return num(a) * num(b);
        case "/":
          return num(b) === 0 ? 0 : num(a) / num(b);
        case "%":
          return num(a) % num(b);
        case "==":
        case "===":
          return a === b;
        case "!=":
        case "!==":
          return a !== b;
        case "<":
          return a < b;
        case ">":
          return a > b;
        case "<=":
          return a <= b;
        case ">=":
          return a >= b;
      }
      throw new Error("Operator " + n.operator);
    }
    case "ConditionalExpression":
      return evalNode(n.test, scope)
        ? evalNode(n.consequent, scope)
        : evalNode(n.alternate, scope);
    case "ArrayExpression":
      return (n.elements as AnyNode[]).flatMap((e) =>
        !e ? [undefined] : e.type === "SpreadElement" ? arr(evalNode(e.argument, scope)) : [evalNode(e, scope)],
      );
    case "ObjectExpression": {
      const out: Record<string, unknown> = {};
      for (const p of n.properties as AnyNode[]) {
        if (p.type === "SpreadElement") {
          Object.assign(out, evalNode(p.argument, scope) as object);
          continue;
        }
        const key = p.computed
          ? String(evalNode(p.key, scope))
          : p.key.type === "Identifier"
            ? p.key.name
            : String(p.key.value);
        if (FORBIDDEN.has(key)) continue;
        out[key] = p.shorthand ? evalNode(p.key, scope) : evalNode(p.value, scope);
      }
      return out;
    }
    case "CallExpression": {
      if (n.callee.type !== "Identifier" || !HELPERS[n.callee.name])
        throw new Error("Unknown function");
      const args = (n.arguments as AnyNode[]).map((a) => evalNode(a, scope));
      return HELPERS[n.callee.name](...args);
    }
    case "Compound":
      return (n.body as AnyNode[]).reduce<unknown>((_, b) => evalNode(b, scope), undefined);
  }
  throw new Error("Unsupported expression: " + n.type);
}

export function evaluate(src: string | undefined, scope: Scope): unknown {
  if (src == null || src === "") return undefined;
  try {
    return evalNode(parse(String(src)), scope);
  } catch {
    return undefined;
  }
}

/** "Jami: {{ fmt(total) }} so'm" -> "Jami: 12 000 so'm" */
export function interpolate(tpl: unknown, scope: Scope): string {
  if (tpl == null) return "";
  const s = String(tpl);
  if (!s.includes("{{")) return s;
  return s.replace(/\{\{([\s\S]+?)\}\}/g, (_, e) => {
    const v = evaluate(e.trim(), scope);
    if (v == null) return "";
    return typeof v === "object" ? JSON.stringify(v) : String(v);
  });
}

export function validateExpr(src: string): string | null {
  try {
    parse(src);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
