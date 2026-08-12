import type { CSSProperties } from "react";
import { gridLine } from "../../render/model";
import SlotGroups from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";

type ColumnStyle = CSSProperties & {
  "--column-span"?: number;
  "--column-start"?: number;
};

export default function Column({
  node,
  slots,
  authoringProps
}: RendererComponentProps) {
  const width = gridLine(node.properties.width) ?? 12;
  const requestedStart = gridLine(node.properties.start);
  const start = requestedStart && requestedStart + width <= 13
    ? requestedStart
    : null;
  const style: ColumnStyle = {
    "--column-span": width,
    ...(start ? { "--column-start": start } : {})
  };
  return (
    <div
      className="content-column"
      data-renderer-type="column"
      style={style}
      {...authoringProps}
    >
      <div className="content-slot" data-slot="content">{slots.content}</div>
      <SlotGroups slots={slots} omitted={["content"]} />
    </div>
  );
}
