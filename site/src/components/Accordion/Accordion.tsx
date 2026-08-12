import { accordionOpen } from "../../render/model";
import SlotGroups from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";

export default function Accordion({
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  return (
    <details
      className="accordion"
      data-renderer-type="accordion"
      open={accordionOpen(authoring)}
      {...authoringProps}
    >
      <summary><span className="accordion__summary">{slots.summary}</span></summary>
      <div className="accordion__details" data-slot="details">{slots.details}</div>
      <SlotGroups slots={slots} omitted={["summary", "details"]} />
    </details>
  );
}
