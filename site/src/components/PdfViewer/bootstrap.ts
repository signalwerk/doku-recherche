let loading: Promise<unknown> | null = null;

function loadPdfViewer() {
  if (!document.querySelector("[data-pdf-viewer]")) return;
  loading ??= import("./client");
}

function start() {
  loadPdfViewer();
  const observer = new MutationObserver(loadPdfViewer);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
