import { nanoid } from "nanoid";
import type { EditableExtraGroup, ModifierExtra } from "@/types/pos";

export type ExtraSection = "flavour" | "addon";

export function extrasToEditableGroups(extras: ModifierExtra[], section: ExtraSection): EditableExtraGroup[] {
  const filtered = extras.filter((e) =>
    section === "flavour" ? (e.sortOrder ?? 999) < 500 : (e.sortOrder ?? 999) >= 500,
  );
  if (filtered.length === 0) {
    return [{ clientKey: nanoid(), name: "", extras: [] }];
  }
  const byName = new Map<string, ModifierExtra[]>();
  for (const e of filtered) {
    const gn = (e.groupName ?? "").trim();
    if (!byName.has(gn)) byName.set(gn, []);
    byName.get(gn)!.push(e);
  }
  const keys = Array.from(byName.keys()).sort((a, b) => {
    if (a === "") return -1;
    if (b === "") return 1;
    const minA = Math.min(...byName.get(a)!.map((x) => x.sortOrder));
    const minB = Math.min(...byName.get(b)!.map((x) => x.sortOrder));
    return minA - minB || a.localeCompare(b);
  });
  return keys.map((name) => ({
    clientKey: nanoid(),
    name,
    extras: byName
      .get(name)!
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((e) => ({
        name: e.name,
        priceDelta: e.priceDelta ?? 0,
        sortOrder: e.sortOrder,
        isActive: e.isActive ?? 1,
        imageUrl: e.imageUrl ?? "",
        maxQuantity: Math.max(1, Math.min(99, Number(e.maxQuantity ?? 1))),
      })),
  }));
}

export function flattenExtraGroupsForApi(
  groups: EditableExtraGroup[],
  baseSortStart: number,
): Array<{
  name: string;
  priceDelta: number;
  sortOrder: number;
  isActive: number;
  imageUrl?: string;
  groupName?: string | null;
  maxQuantity: number;
}> {
  let idx = 0;
  const out: Array<{
    name: string;
    priceDelta: number;
    sortOrder: number;
    isActive: number;
    imageUrl?: string;
    groupName?: string | null;
    maxQuantity: number;
  }> = [];
  for (const g of groups) {
    const groupName = g.name.trim() || undefined;
    for (const ex of g.extras) {
      if (!ex.name.trim()) continue;
      out.push({
        name: ex.name.trim(),
        priceDelta: ex.priceDelta ?? 0,
        sortOrder: baseSortStart + idx,
        isActive: ex.isActive ?? 1,
        imageUrl: ex.imageUrl?.trim() ? ex.imageUrl.trim() : undefined,
        groupName: groupName ?? null,
        maxQuantity: Math.max(1, Math.min(99, ex.maxQuantity ?? 1)),
      });
      idx += 1;
    }
  }
  return out;
}

/** Group extras in one section (flavour vs add-on) for customer-facing UI. */
export function groupExtrasForSectionDisplay(
  extras: ModifierExtra[],
  section: ExtraSection,
): { key: string; title: string | null; extras: ModifierExtra[] }[] {
  const filtered = extras.filter((e) =>
    section === "flavour" ? (e.sortOrder ?? 999) < 500 : (e.sortOrder ?? 999) >= 500,
  );
  if (filtered.length === 0) return [];
  const byName = new Map<string, ModifierExtra[]>();
  for (const e of filtered) {
    const gn = (e.groupName ?? "").trim();
    if (!byName.has(gn)) byName.set(gn, []);
    byName.get(gn)!.push(e);
  }
  const keys = Array.from(byName.keys()).sort((a, b) => {
    if (a === "") return -1;
    if (b === "") return 1;
    const minA = Math.min(...byName.get(a)!.map((x) => x.sortOrder));
    const minB = Math.min(...byName.get(b)!.map((x) => x.sortOrder));
    return minA - minB || a.localeCompare(b);
  });
  return keys.map((name) => ({
    key: name || "_default",
    title: name.trim() ? name.trim() : null,
    extras: byName
      .get(name)!
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  }));
}
