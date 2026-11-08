"use client";
import { ArrowDown, ArrowUp, BracketsCurly, CalendarBlank, CurrencyCircleDollar, Hash, Image as ImageIcon, LinkSimple, ListBullets, Phone, Tag, TextT, ToggleLeft, TreeStructure } from "@phosphor-icons/react";
import type { Column, FieldType } from "@/lib/dataModel";
import { TYPE_LABEL } from "@/lib/dataModel";
import type { TableView } from "@/lib/server/dataview";
import { CellView, type Lookup } from "./cells";

export const TYPE_ICON: Record<FieldType, React.ReactNode> = {
  text: <TextT size={13} />,
  number: <Hash size={13} />,
  money: <CurrencyCircleDollar size={13} />,
  boolean: <ToggleLeft size={13} />,
  date: <CalendarBlank size={13} />,
  phone: <Phone size={13} />,
  url: <LinkSimple size={13} />,
  image: <ImageIcon size={13} />,
  select: <Tag size={13} />,
  relation: <TreeStructure size={13} />,
  list: <ListBullets size={13} />,
  object: <BracketsCurly size={13} />,
};

type Row = TableView["rows"][number];

/** Typed, sortable, filterable table. Values are rendered by column type (badges, money, dates, relation chips...). */
export function DataTable({
  columns,
  rows,
  sort,
  dir,
  onSort,
  filters,
  onFilter,
  onRow,
  lookup,
  activeId,
}: {
  columns: Column[];
  rows: Row[];
  sort: string;
  dir: "asc" | "desc";
  onSort: (key: string) => void;
  filters: Record<string, string>;
  onFilter: (key: string, value: string | null) => void;
  onRow: (r: Row) => void;
  lookup?: Lookup;
  activeId?: string | null;
}) {
  return (
    <table className="w-full min-w-max border-separate border-spacing-0 text-[13px]">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className="sticky top-0 z-10 border-b border-line bg-panel px-3 py-2 text-left align-bottom font-medium">
              <button onClick={() => onSort(c.key)} className="group flex items-center gap-1.5 text-muted hover:text-fg" title={`${TYPE_LABEL[c.type]}${c.ref ? " → " + c.ref : ""}`}>
                <span className="text-muted/70">{TYPE_ICON[c.type]}</span>
                <span className="whitespace-nowrap text-[12px] font-medium">{c.label}</span>
                {sort === c.key ? dir === "asc" ? <ArrowUp size={12} className="text-accent-2" /> : <ArrowDown size={12} className="text-accent-2" /> : <ArrowDown size={12} className="opacity-0 group-hover:opacity-40" />}
              </button>
              {c.type === "select" && c.options && c.options.length > 1 && (
                <select
                  value={filters[c.key] ?? ""}
                  onChange={(e) => onFilter(c.key, e.target.value || null)}
                  className="mt-1 w-full max-w-36 rounded border border-line bg-bg px-1 py-0.5 text-[11px] font-normal text-muted outline-none focus:border-accent"
                >
                  <option value="">Hammasi</option>
                  {c.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={r.id}
            onClick={() => onRow(r)}
            style={{ ["--i" as string]: Math.min(i, 12) }}
            className={`rise cursor-pointer transition-colors hover:bg-panel-2/70 ${activeId === r.id ? "bg-accent/10" : ""}`}
          >
            {columns.map((c) => (
              <td key={c.key} className="max-w-80 border-b border-line/60 px-3 py-2 align-middle">
                <CellView col={c} value={r.cells[c.key]} lookup={lookup} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
