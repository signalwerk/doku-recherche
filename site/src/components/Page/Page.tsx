import SlotGroups from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";
import { propertyText } from "../../render/types";

export default function Page({
  node,
  slots,
  authoringProps
}: RendererComponentProps) {
  const title = propertyText(node, "title") || "Untitled page";
  const layout = node.properties.layout === "wide" ? "wide" : "default";

  return (
    <article
      className={"page page--" + layout}
      data-renderer-type="page"
      {...authoringProps}
    >
      <header className="site-header">
        <p className="site-header__title">
          Dokumentationsstelle für geschichtliche Recherchen
        </p>
      </header>
      <h1 className="visually-hidden">{title}</h1>
      <div className="page__content" data-slot="content">
        {slots.content}
      </div>
      <SlotGroups slots={slots} omitted={["content"]} />
      <footer className="site-footer">
        <p>
          Dokumentationsstelle für geschichtliche Recherchen Zürich · 8050 Zürich ·{" "}
          <a href="mailto:info.recherche@ggaweb.ch">info.recherche@ggaweb.ch</a>
        </p>
      </footer>
    </article>
  );
}
