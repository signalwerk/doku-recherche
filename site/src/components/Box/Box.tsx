import { safeBoxBackground } from "../../render/model";
import SlotGroups from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";

export default function Box({
  node,
  slots,
  authoringProps
}: RendererComponentProps) {
  const background = safeBoxBackground(node.properties.background);
  return (
    <section
      className={"content-box content-box--" + background}
      data-renderer-type="box"
      {...authoringProps}
    >
      <div className="content-slot" data-slot="content">{slots.content}</div>
      <SlotGroups slots={slots} omitted={["content"]} />
    </section>
  );
}
