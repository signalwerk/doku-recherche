import { safeGridLayout } from "../../render/model";
import SlotGroups from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";

export default function Grid({
  node,
  slots,
  authoringProps
}: RendererComponentProps) {
  const layout = safeGridLayout(node.properties.layout);
  return (
    <section
      className={"content-grid content-grid--" + layout}
      data-renderer-type="grid"
      {...authoringProps}
    >
      {slots.columns}
      <SlotGroups slots={slots} omitted={["columns"]} />
    </section>
  );
}
