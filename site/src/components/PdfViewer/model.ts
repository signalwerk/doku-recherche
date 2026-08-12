export function lastSpreadStart(totalPages: number): number {
  const total = Math.max(1, Math.floor(totalPages));
  if (total === 1) return 1;
  return total % 2 === 0 ? total : total - 1;
}

export function normalizeSpreadStart(
  requestedStart: number,
  totalPages: number
): number {
  const total = Math.max(1, Math.floor(totalPages));
  if (total === 1 || requestedStart <= 1) return 1;
  const evenStart = Math.floor(requestedStart / 2) * 2;
  return Math.min(Math.max(2, evenStart), lastSpreadStart(total));
}

export function spreadPages(start: number, totalPages: number): number[] {
  const total = Math.max(1, Math.floor(totalPages));
  const normalizedStart = normalizeSpreadStart(start, total);
  if (normalizedStart === 1) return [1];
  return [normalizedStart, normalizedStart + 1].filter(
    (pageNumber) => pageNumber <= total
  );
}

export function nextSpreadStart(start: number, totalPages: number): number {
  const current = normalizeSpreadStart(start, totalPages);
  return normalizeSpreadStart(current === 1 ? 2 : current + 2, totalPages);
}

export function previousSpreadStart(start: number, totalPages: number): number {
  const current = normalizeSpreadStart(start, totalPages);
  return current <= 2 ? 1 : normalizeSpreadStart(current - 2, totalPages);
}

export function spreadStatus(pages: number[], totalPages: number): string {
  const total = Math.max(1, Math.floor(totalPages));
  return pages.length === 1
    ? `Seite ${pages[0]} von ${total}`
    : `Seiten ${pages[0]}–${pages[1]} von ${total}`;
}

export function fittedSpreadWidth(
  containerWidth: number,
  availableHeight: number,
  pageRatios: number[]
): number {
  const width = Math.max(0, containerWidth);
  const height = Math.max(0, availableHeight);
  if (width === 0 || height === 0 || pageRatios.length === 0) return 0;

  const ratios = pageRatios.map((ratio) =>
    Number.isFinite(ratio) && ratio > 0 ? ratio : 1
  );
  const narrowestPage = Math.min(...ratios);
  const pageHeight = Math.min(height, width / (2 * narrowestPage));
  return pageHeight * narrowestPage * Math.min(ratios.length, 2);
}
