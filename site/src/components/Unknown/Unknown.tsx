import SlotGroups from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";

function printableProperties(properties: Record<string, unknown>): string {
  try {
    return JSON.stringify(properties, null, 2);
  } catch {
    return "[Properties could not be displayed]";
  }
}

export default function Unknown({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  return (
    <section
      className="unknown-content"
      data-renderer-type="unknown"
      data-unsupported-type={node.type}
      {...authoringProps}
    >
      <strong>Unsupported content type: {node.type || "(missing type)"}</strong>
      {authoring ? <pre>{printableProperties(node.properties)}</pre> : null}
      <SlotGroups slots={slots} />
    </section>
  );
}
