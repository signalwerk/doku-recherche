import Renderer from "../render/Renderer";
import type { PreviewRendererProps } from "../render/types";
import stylesheet from "../styles/site.scss?inline";
import "../components/PdfViewer/client";

export function ProjectPreview({ data, focus }: PreviewRendererProps) {
  return (
    <>
      <style>{stylesheet}</style>
      <Renderer data={data} focus={focus} basePath={import.meta.env.BASE_URL} />
    </>
  );
}
