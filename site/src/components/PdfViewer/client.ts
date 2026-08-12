import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask
} from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker&inline";
import {
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

function initializePdfViewer(root: HTMLElement, source: string): ViewerController {
  const stage = element<HTMLElement>(root, "[data-pdf-stage]");
  const frames = [...root.querySelectorAll<HTMLElement>("[data-pdf-page-frame]")];
  const canvases = [...root.querySelectorAll<HTMLCanvasElement>("[data-pdf-canvas]")];
  const previous = element<HTMLButtonElement>(root, "[data-pdf-previous]");
  const next = element<HTMLButtonElement>(root, "[data-pdf-next]");
  const status = element<HTMLElement>(root, "[data-pdf-status]");
  const message = element<HTMLElement>(root, "[data-pdf-message]");
  const loadingTask = getDocument({ url: source });
  let document: PDFDocumentProxy | null = null;
  let spreadStart = 1;
  let renderGeneration = 0;
  let renderTasks: RenderTask[] = [];
  let resizeTimer = 0;
  let destroyed = false;

  function cancelRendering() {
    renderGeneration += 1;
    for (const task of renderTasks) task.cancel();
    renderTasks = [];
  }

  async function renderPage(
    pageNumber: number,
    frame: HTMLElement,
    canvas: HTMLCanvasElement,
    generation: number
  ) {
    if (!document) return;
    const page = await document.getPage(pageNumber);
    if (destroyed || generation !== renderGeneration) return;

    const originalViewport = page.getViewport({ scale: 1 });
    frame.style.aspectRatio = `${originalViewport.width} / ${originalViewport.height}`;
    const cssWidth = frame.getBoundingClientRect().width;
    if (cssWidth < 1) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({
      scale: (cssWidth * pixelRatio) / originalViewport.width
    });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${viewport.height / pixelRatio}px`;
    canvas.setAttribute("aria-label", `Seite ${pageNumber}`);

    const task = page.render({ canvas, viewport });
    renderTasks.push(task);
    await task.promise;
  }

  async function renderSpread() {
    if (!document || destroyed) return;
    cancelRendering();
    const generation = renderGeneration;
    const pages = spreadPages(spreadStart, document.numPages);
    stage.dataset.pageCount = String(pages.length);
    status.textContent = spreadStatus(pages, document.numPages);
    previous.disabled = spreadStart === 1;
    next.disabled = spreadStart === lastSpreadStart(document.numPages);

    frames.forEach((frame, index) => {
      const pageNumber = pages[index];
      frame.hidden = pageNumber === undefined;
      if (pageNumber === undefined) {
        canvases[index]?.removeAttribute("aria-label");
      }
    });

    try {
      await Promise.all(
        pages.map((pageNumber, index) => {
          const frame = frames[index];
          const canvas = canvases[index];
          return frame && canvas
            ? renderPage(pageNumber, frame, canvas, generation)
            : Promise.resolve();
        })
      );
      if (!destroyed && generation === renderGeneration) message.textContent = "";
    } catch (error) {
      if (error instanceof Error && error.name === "RenderingCancelledException") return;
      if (!destroyed) message.textContent = "Die PDF-Seiten konnten nicht dargestellt werden.";
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

  const resizeObserver = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => void renderSpread(), 120);
  });
  resizeObserver.observe(stage);

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
