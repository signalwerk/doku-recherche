import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type RenderTask,
  TextLayer
} from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker&inline";
import {
  fittedSpreadWidth,
  lastSpreadStart,
  nextSpreadStart,
  previousSpreadStart,
  spreadPages,
  spreadStatus
} from "./model";

type ViewerController = {
  source: string;
  destroy: () => void;
};

const controllers = new WeakMap<HTMLElement, ViewerController>();

if (!GlobalWorkerOptions.workerPort) {
  GlobalWorkerOptions.workerPort = new PdfWorker();
}

function element<T extends Element>(root: HTMLElement, selector: string): T {
  const match = root.querySelector<T>(selector);
  if (!match) throw new Error(`Missing PDF viewer element: ${selector}`);
  return match;
}

function cssPixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function outerBlockSize(target: HTMLElement): number {
  const styles = window.getComputedStyle(target);
  return target.getBoundingClientRect().height
    + cssPixels(styles.marginTop)
    + cssPixels(styles.marginBottom);
}

function initializePdfViewer(root: HTMLElement, source: string): ViewerController {
  const stage = element<HTMLElement>(root, "[data-pdf-stage]");
  const frames = [...root.querySelectorAll<HTMLElement>("[data-pdf-page-frame]")];
  const canvases = [...root.querySelectorAll<HTMLCanvasElement>("[data-pdf-canvas]")];
  const textLayerContainers = [
    ...root.querySelectorAll<HTMLElement>("[data-pdf-text-layer]")
  ];
  const controls = element<HTMLElement>(root, ".pdf-viewer__controls");
  const loading = element<HTMLElement>(root, "[data-pdf-loading]");
  const previous = element<HTMLButtonElement>(root, "[data-pdf-previous]");
  const next = element<HTMLButtonElement>(root, "[data-pdf-next]");
  const status = element<HTMLElement>(root, "[data-pdf-status]");
  const message = element<HTMLElement>(root, "[data-pdf-message]");
  const loadingTask = getDocument({ url: source });
  let document: PDFDocumentProxy | null = null;
  let spreadStart = 1;
  let renderGeneration = 0;
  let renderTasks: RenderTask[] = [];
  let textLayers: TextLayer[] = [];
  let resizeTimer = 0;
  let destroyed = false;

  function setLoading(isLoading: boolean) {
    loading.hidden = !isLoading;
    root.setAttribute("aria-busy", String(isLoading));
  }

  function cancelRendering() {
    renderGeneration += 1;
    for (const task of renderTasks) task.cancel();
    for (const layer of textLayers) layer.cancel();
    renderTasks = [];
    textLayers = [];
    for (const container of textLayerContainers) container.replaceChildren();
  }

  async function renderPage(
    pageNumber: number,
    page: PDFPageProxy,
    frame: HTMLElement,
    canvas: HTMLCanvasElement,
    textLayerContainer: HTMLElement,
    generation: number
  ) {
    if (destroyed || generation !== renderGeneration) return;

    const originalViewport = page.getViewport({ scale: 1 });
    const cssWidth = frame.getBoundingClientRect().width;
    if (cssWidth < 1) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const cssViewport = page.getViewport({
      scale: cssWidth / originalViewport.width
    });
    const viewport = page.getViewport({
      scale: (cssWidth * pixelRatio) / originalViewport.width
    });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${viewport.height / pixelRatio}px`;
    canvas.setAttribute("aria-label", `Seite ${pageNumber}`);

    const task = page.render({ canvas, viewport });
    textLayerContainer.style.setProperty(
      "--total-scale-factor",
      String(cssViewport.scale * page.userUnit)
    );
    const textLayer = new TextLayer({
      textContentSource: page.streamTextContent({
        includeMarkedContent: true,
        disableNormalization: true
      }),
      container: textLayerContainer,
      viewport: cssViewport
    });
    renderTasks.push(task);
    textLayers.push(textLayer);
    await Promise.all([task.promise, textLayer.render()]);
  }

  function fitSpreadToViewport(pageRatios: number[]) {
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const stageTop = Math.max(0, stage.getBoundingClientRect().top);
    const navigationHeight = outerBlockSize(message) + outerBlockSize(controls);
    const availableHeight = Math.max(
      1,
      viewportHeight - stageTop - navigationHeight - 16
    );
    const fittedWidth = fittedSpreadWidth(
      root.getBoundingClientRect().width,
      availableHeight,
      pageRatios
    );

    if (fittedWidth > 0) {
      root.style.setProperty("--pdf-stage-width", `${Math.floor(fittedWidth)}px`);
    }
  }

  async function renderSpread() {
    if (!document || destroyed) return;
    const currentDocument = document;
    cancelRendering();
    setLoading(true);
    const generation = renderGeneration;
    const pages = spreadPages(spreadStart, document.numPages);
    stage.dataset.pageCount = String(pages.length);
    root.dataset.pdfPageCount = String(pages.length);
    status.textContent = spreadStatus(pages, document.numPages);
    previous.disabled = spreadStart === 1;
    next.disabled = spreadStart === lastSpreadStart(document.numPages);

    frames.forEach((frame, index) => {
      const pageNumber = pages[index];
      frame.hidden = pageNumber === undefined;
      if (pageNumber === undefined) {
        canvases[index]?.removeAttribute("aria-label");
        textLayerContainers[index]?.replaceChildren();
      }
    });

    try {
      const loadedPages = await Promise.all(
        pages.map(async (pageNumber) => ({
          pageNumber,
          page: await currentDocument.getPage(pageNumber)
        }))
      );
      if (destroyed || generation !== renderGeneration) return;

      const pageRatios = loadedPages.map(({ page }, index) => {
        const viewport = page.getViewport({ scale: 1 });
        const frame = frames[index];
        if (frame) frame.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
        return viewport.width / viewport.height;
      });
      message.textContent = "";
      fitSpreadToViewport(pageRatios);

      await Promise.all(
        loadedPages.map(({ pageNumber, page }, index) => {
          const frame = frames[index];
          const canvas = canvases[index];
          const textLayerContainer = textLayerContainers[index];
          return frame && canvas && textLayerContainer
            ? renderPage(
                pageNumber,
                page,
                frame,
                canvas,
                textLayerContainer,
                generation
              )
            : Promise.resolve();
        })
      );
      if (!destroyed && generation === renderGeneration) setLoading(false);
    } catch (error) {
      if (destroyed || generation !== renderGeneration) return;
      if (error instanceof Error && error.name === "RenderingCancelledException") return;
      if (!destroyed) {
        setLoading(false);
        message.textContent = "Die PDF-Seiten konnten nicht dargestellt werden.";
      }
    }
  }

  function showPrevious() {
    if (!document) return;
    spreadStart = previousSpreadStart(spreadStart, document.numPages);
    void renderSpread();
  }

  function showNext() {
    if (!document) return;
    spreadStart = nextSpreadStart(spreadStart, document.numPages);
    void renderSpread();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    } else if (event.key === "Home" && document) {
      event.preventDefault();
      spreadStart = 1;
      void renderSpread();
    } else if (event.key === "End" && document) {
      event.preventDefault();
      spreadStart = lastSpreadStart(document.numPages);
      void renderSpread();
    }
  }

  previous.addEventListener("click", showPrevious);
  next.addEventListener("click", showNext);
  root.addEventListener("keydown", onKeydown);

  function scheduleResizeRender() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => void renderSpread(), 120);
  }

  let observedRootWidth = root.getBoundingClientRect().width;
  const resizeObserver = new ResizeObserver(([entry]) => {
    const width = entry?.contentRect.width ?? root.getBoundingClientRect().width;
    if (Math.abs(width - observedRootWidth) < 0.5) return;
    observedRootWidth = width;
    scheduleResizeRender();
  });
  resizeObserver.observe(root);
  window.addEventListener("resize", scheduleResizeRender);
  window.visualViewport?.addEventListener("resize", scheduleResizeRender);

  void loadingTask.promise.then(
    (loadedDocument) => {
      if (destroyed) {
        void loadingTask.destroy();
        return;
      }
      document = loadedDocument;
      void renderSpread();
    },
    () => {
      if (!destroyed) {
        setLoading(false);
        message.textContent = "Das PDF konnte nicht geladen werden.";
        status.textContent = "PDF nicht verfügbar";
      }
    }
  );

  return {
    source,
    destroy() {
      destroyed = true;
      cancelRendering();
      resizeObserver.disconnect();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", scheduleResizeRender);
      window.visualViewport?.removeEventListener("resize", scheduleResizeRender);
      previous.removeEventListener("click", showPrevious);
      next.removeEventListener("click", showNext);
      root.removeEventListener("keydown", onKeydown);
      void loadingTask.destroy();
    }
  };
}

export function initializePdfViewers(scope: ParentNode = document) {
  for (const root of scope.querySelectorAll<HTMLElement>("[data-pdf-viewer]")) {
    const source = root.dataset.pdfSrc;
    const current = controllers.get(root);
    if (!source) {
      current?.destroy();
      controllers.delete(root);
      continue;
    }
    if (current?.source === source) continue;
    current?.destroy();
    controllers.set(root, initializePdfViewer(root, source));
  }
}

function start() {
  initializePdfViewers();
  const observer = new MutationObserver(() => initializePdfViewers());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-pdf-src"]
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
