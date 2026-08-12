import type { ContentNode } from "@signalwerk/minicms/content";
import SlotGroups from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";
import { propertyText } from "../../render/types";

export default function Shortcut({
  node,
  slots,
  authoringProps
}: RendererComponentProps) {
  const mode = node.properties.mode === "selected_target"
    ? "Selected page"
    : "First visible child";
  const targetValue = node.properties.target;
  const target = targetValue && typeof targetValue === "object" && !Array.isArray(targetValue)
    ? targetValue as Record<string, unknown>
    : null;
  const targetRecord = target?.record && typeof target.record === "object"
    ? target.record as ContentNode
    : null;
  const targetTitle = targetRecord
    ? propertyText(targetRecord, "title") || targetRecord.id
    : target?.ref !== undefined
      ? String(target.ref)
      : "Not selected";

  return (
    <article
      className="shortcut"
      data-renderer-type="shortcut"
      {...authoringProps}
    >
      <p className="eyebrow">Redirect</p>
      <h1>{propertyText(node, "title") || "Untitled shortcut"}</h1>
      <dl>
        <div><dt>Mode</dt><dd>{mode}</dd></div>
        <div><dt>Destination</dt><dd>{targetTitle}</dd></div>
      </dl>
      <SlotGroups slots={slots} />
    </article>
  );
}
