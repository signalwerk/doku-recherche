import { parseTitleElement } from "../../render/model";
import SlotGroups from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";
import { propertyText } from "../../render/types";

export default function Title({
  node,
  slots,
  authoringProps
}: RendererComponentProps) {
  const { tag: Element, className } = parseTitleElement(node.properties.element);
  return (
    <Element
      className={className}
      data-renderer-type="title"
      {...authoringProps}
    >
      {propertyText(node, "title")}
      <SlotGroups slots={slots} />
    </Element>
  );
}
