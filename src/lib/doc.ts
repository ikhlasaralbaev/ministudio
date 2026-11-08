import { nanoid } from "nanoid";
import type { AppDoc, Op, UINode } from "./types";

export const newId = (prefix = "n") => `${prefix}_${nanoid(6)}`;

export function walk(
  nodes: UINode[],
  fn: (n: UINode, parent: UINode | null, index: number) => void,
  parent: UINode | null = null,
) {
  nodes.forEach((n, i) => {
    fn(n, parent, i);
    if (n.children) walk(n.children, fn, n);
  });
}

export function findNode(doc: AppDoc, id: string): UINode | null {
  let found: UINode | null = null;
  walk(doc.screens, (n) => {
    if (n.id === id) found = n;
  });
  return found;
}

export function findParent(doc: AppDoc, id: string): { parent: UINode | null; index: number } | null {
  let res: { parent: UINode | null; index: number } | null = null;
  walk(doc.screens, (n, p, i) => {
    if (n.id === id) res = { parent: p, index: i };
  });
  return res;
}

/** Path of ancestors (screen first) for a node id. */
export function nodePath(doc: AppDoc, id: string): UINode[] {
  const path: UINode[] = [];
  const rec = (nodes: UINode[]): boolean => {
    for (const n of nodes) {
      path.push(n);
      if (n.id === id) return true;
      if (n.children && rec(n.children)) return true;
      path.pop();
    }
    return false;
  };
  rec(doc.screens);
  return path;
}

export function screenOf(doc: AppDoc, id: string): UINode | null {
  return nodePath(doc, id)[0] ?? null;
}

/** Give every node a unique id (fix duplicates / missing ids from AI or duplication). */
export function ensureIds(nodes: UINode[], seen = new Set<string>()): UINode[] {
  return nodes.map((n) => {
    let id = n.id && !seen.has(n.id) ? n.id : newId(n.type?.toLowerCase().slice(0, 3) || "n");
    while (seen.has(id)) id = newId();
    seen.add(id);
    const out: UINode = { ...n, id };
    // no `children: undefined` key: the MongoDB driver would store it as null
    if (n.children) out.children = ensureIds(n.children, seen);
    else delete out.children;
    return out;
  });
}

export function cloneWithNewIds(n: UINode): UINode {
  return {
    ...structuredClone(n),
    id: newId(n.type.toLowerCase().slice(0, 3)),
    children: n.children?.map(cloneWithNewIds),
  };
}

function collectIds(doc: AppDoc): Set<string> {
  const s = new Set<string>();
  walk(doc.screens, (n) => s.add(n.id));
  return s;
}

function mapTree(nodes: UINode[], fn: (n: UINode) => UINode | null): UINode[] {
  const out: UINode[] = [];
  for (const n of nodes) {
    const r = fn(n);
    if (!r) continue;
    out.push(r.children ? { ...r, children: mapTree(r.children, fn) } : r);
  }
  return out;
}

function mergeStyle(
  base: Record<string, string | number> | undefined,
  patch: Record<string, string | number | null>,
) {
  const out: Record<string, string | number> = { ...(base || {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out;
}

export class OpError extends Error {}

/** Apply a list of edit operations immutably. Throws OpError on invalid references. */
export function applyOps(doc: AppDoc, ops: Op[]): AppDoc {
  const d: AppDoc = structuredClone(doc);
  for (const op of ops) {
    switch (op.op) {
      case "update": {
        if (!findNode(d, op.id)) throw new OpError(`update: node ${op.id} not found`);
        d.screens = mapTree(d.screens, (n) => {
          if (n.id !== op.id) return n;
          const next: UINode = { ...n };
          if (op.name !== undefined) next.name = op.name;
          if (op.props) {
            const p = { ...(n.props || {}) };
            for (const [k, v] of Object.entries(op.props)) {
              if (v === null) delete p[k];
              else p[k] = v;
            }
            next.props = p;
          }
          if (op.style) next.style = mergeStyle(n.style, op.style);
          if (op.events === null) delete next.events;
          else if (op.events) next.events = { ...(n.events || {}), ...op.events };
          if (op.visibleIf === null || op.visibleIf === "") delete next.visibleIf;
          else if (op.visibleIf !== undefined) next.visibleIf = op.visibleIf;
          return next;
        });
        break;
      }
      case "replace": {
        if (!findNode(d, op.id)) throw new OpError(`replace: node ${op.id} not found`);
        const ids = collectIds(d);
        // ids inside the replaced subtree are free to reuse
        const old = findNode(d, op.id)!;
        walk([old], (n) => ids.delete(n.id));
        const [fresh] = ensureIds([op.node], ids);
        d.screens = mapTree(d.screens, (n) => (n.id === op.id ? fresh : n));
        // a replaced screen keeps being a screen
        break;
      }
      case "insert": {
        const parent = findNode(d, op.parentId);
        if (!parent) throw new OpError(`insert: parent ${op.parentId} not found`);
        const [fresh] = ensureIds([op.node], collectIds(d));
        d.screens = mapTree(d.screens, (n) => {
          if (n.id !== op.parentId) return n;
          const children = [...(n.children || [])];
          const idx = op.index == null ? children.length : Math.max(0, Math.min(op.index, children.length));
          children.splice(idx, 0, fresh);
          return { ...n, children };
        });
        break;
      }
      case "delete": {
        if (d.screens.some((s) => s.id === op.id)) {
          if (d.screens.length === 1) throw new OpError("cannot delete the last screen");
          d.screens = d.screens.filter((s) => s.id !== op.id);
        } else {
          if (!findNode(d, op.id)) throw new OpError(`delete: node ${op.id} not found`);
          d.screens = mapTree(d.screens, (n) => (n.id === op.id ? null : n));
        }
        break;
      }
      case "move": {
        const node = findNode(d, op.id);
        if (!node) throw new OpError(`move: node ${op.id} not found`);
        if (!findNode(d, op.parentId)) throw new OpError(`move: parent ${op.parentId} not found`);
        if (nodePath(d, op.parentId).some((n) => n.id === op.id))
          throw new OpError("move: cannot move into itself");
        d.screens = mapTree(d.screens, (n) => (n.id === op.id ? null : n));
        const index = op.index; // final position inside the new parent
        d.screens = mapTree(d.screens, (n) => {
          if (n.id !== op.parentId) return n;
          const children = [...(n.children || [])];
          children.splice(Math.max(0, Math.min(index, children.length)), 0, node);
          return { ...n, children };
        });
        break;
      }
      case "setState":
        d.state = { ...d.state, [op.key]: op.value };
        break;
      case "setCollection": {
        const i = d.collections.findIndex((c) => c.name === op.collection.name);
        if (i >= 0) d.collections[i] = op.collection;
        else d.collections.push(op.collection);
        break;
      }
      case "deleteCollection":
        d.collections = d.collections.filter((c) => c.name !== op.name);
        break;
      case "addScreen": {
        const [fresh] = ensureIds([{ ...op.screen, type: "Screen" }], collectIds(d));
        d.screens.push(fresh);
        break;
      }
      case "setTheme":
        d.theme = { ...d.theme, ...op.theme };
        break;
      case "setBot":
        d.bot = { ...d.bot, ...op.bot };
        break;
      case "rename":
        d.name = op.name;
        break;
    }
  }
  return d;
}

/** Small summary of the doc for prompts / layers. */
export function outline(doc: AppDoc): string {
  const lines: string[] = [];
  const rec = (n: UINode, depth: number) => {
    const label =
      (n.props?.text as string) || (n.props?.name as string) || (n.props?.title as string) || "";
    lines.push(`${"  ".repeat(depth)}${n.type}#${n.id}${label ? ` "${String(label).slice(0, 40)}"` : ""}`);
    n.children?.forEach((c) => rec(c, depth + 1));
  };
  doc.screens.forEach((s) => rec(s, 0));
  return lines.join("\n");
}
