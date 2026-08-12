import ReactMarkdown from "react-markdown";
import { markdownSource } from "../../render/model";
import SlotGroups from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";

export default function Text({
  node,
  slots,
  authoringProps
}: RendererComponentProps) {
  return (
    <div
      className="prose"
      data-renderer-type="text"
      {...authoringProps}
    >
      <ReactMarkdown skipHtml>{markdownSource(node.properties.text)}</ReactMarkdown>
      <SlotGroups slots={slots} />
    </div>
  );
}
