import ReactMarkdown from "react-markdown";
import { resolvedMarkdown } from "../../render/model";
import SlotGroups from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";
import {
  markdownLinkPresentation,
  markdownUrlTransform
} from "./markdownLink";

export default function Text({
  node,
  slots,
  basePath,
  authoringProps
}: RendererComponentProps) {
  const text = resolvedMarkdown(node.properties.text);
  return (
    <div
      className="prose"
      data-renderer-type="text"
      {...authoringProps}
    >
      <ReactMarkdown
        skipHtml
        urlTransform={markdownUrlTransform}
        components={{
          a({ node: _node, href, children, className, title, ...props }) {
            const internal = markdownLinkPresentation(href, text.links, basePath);
            if (!internal) {
              return (
                <a {...props} className={className} href={href} title={title}>
                  {children}
                </a>
              );
            }
            const internalClass = ["prose__internal-link", className]
              .filter(Boolean)
              .join(" ");
            const internalProps = {
              className: internalClass,
              title,
              "data-link-collection": internal.collection,
              "data-link-id": internal.ref,
              "data-link-missing": internal.href ? undefined : "true"
            };
            return internal.href ? (
              <a {...props} {...internalProps} href={internal.href}>
                {children}
              </a>
            ) : (
              <span {...internalProps}>{children}</span>
            );
          }
        }}
      >
        {text.markdown}
      </ReactMarkdown>
      <SlotGroups slots={slots} />
    </div>
  );
}
