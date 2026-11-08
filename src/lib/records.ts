// Stored records as the mini app sees them. Shared by the server (shaping rows) and the runtime (local cache).

/** A record in app scope: its data fields plus system fields `_id`, `_number` (#1001...) and `_at` (ISO time). */
export type RecordRow = Record<string, unknown> & { _id: string; _number: number; _at: string };
export type RecordsByCollection = Record<string, RecordRow[]>;

export function toRow(doc: { _id: unknown; number: number; data: unknown; createdAt: Date | string }): RecordRow {
  const data =
    doc.data && typeof doc.data === "object" && !Array.isArray(doc.data) ? (doc.data as Record<string, unknown>) : { value: doc.data };
  return {
    ...data,
    _id: String(doc._id),
    _number: doc.number,
    _at: new Date(doc.createdAt).toISOString(),
  };
}

export type RecordChange =
  | { type: "insert"; collection: string; row: RecordRow }
  | { type: "update"; collection: string; row: RecordRow }
  | { type: "delete"; collection: string; id: string };

/** Applies a confirmed server change to the local cache (newest first). Never mutates the input. */
export function applyRecordChange(all: RecordsByCollection, c: RecordChange): RecordsByCollection {
  const list = all[c.collection] || [];
  switch (c.type) {
    case "insert":
      return { ...all, [c.collection]: [c.row, ...list.filter((r) => r._id !== c.row._id)] };
    case "update":
      return { ...all, [c.collection]: list.map((r) => (r._id === c.row._id ? c.row : r)) };
    case "delete":
      return { ...all, [c.collection]: list.filter((r) => r._id !== c.id) };
  }
}
