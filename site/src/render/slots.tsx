import type { ReactNode } from "react";
import type { RenderedSlots } from "./types";

export function slotEntries(
  slots: RenderedSlots,
  omitted: readonly string[] = []
): Array<[string, ReactNode[]]> {
  const omittedNames = new Set(omitted);
  return Object.entries(slots).filter(([name]) => !omittedNames.has(name));
}

export function hasSlotContent(slots: RenderedSlots): boolean {
  return Object.values(slots).some((children) => children.length > 0);
}

export default function SlotGroups({
  slots,
  omitted = []
}: {
  slots: RenderedSlots;
  omitted?: readonly string[];
}) {
  return slotEntries(slots, omitted).map(([name, children]) => (
    <div className="content-slot" data-slot={name} key={name}>
      {children}
    </div>
  ));
}
