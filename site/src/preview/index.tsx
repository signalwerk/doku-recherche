import Renderer from "../render/Renderer";
import type { PreviewRendererProps } from "../render/types";
import stylesheet from "../styles/site.scss?inline";

export function ProjectPreview({ data, focus }: PreviewRendererProps) {
  return (
    <>
      <style>{stylesheet}</style>
      <Renderer data={data} focus={focus} />
    </>
  );
}
