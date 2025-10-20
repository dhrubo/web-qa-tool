export function runQAChecks(
  url: string,
  searchWords: string[],
  selectedChecks: any,
  viewportWidth: number,
  queryMode: "single-alpha" | "multi-desktop",
  onUpdate: (data: any) => void,
  onError: (error: any) => void,
  onComplete: () => void
) {
  const eventSource = new EventSource(
    `/api/qa-stream?${new URLSearchParams({
      url,
      searchWords: JSON.stringify(searchWords),
      selectedChecks: JSON.stringify(selectedChecks),
      viewportWidth: viewportWidth.toString(),
      queryMode: queryMode,
    })}`
  );

  eventSource.addEventListener('status', (event: MessageEvent) => {
    onUpdate({ type: 'status', data: JSON.parse(event.data) });
  });

  eventSource.addEventListener('screenshot', (event: MessageEvent) => {
    onUpdate({ type: 'screenshot', data: JSON.parse(event.data) });
  });

  eventSource.addEventListener('screenshotAlpha', (event: MessageEvent) => {
    onUpdate({ type: 'screenshotAlpha', data: JSON.parse(event.data) });
  });

  eventSource.addEventListener('visual-diff', (event: MessageEvent) => {
    onUpdate({ type: 'visual-diff', data: JSON.parse(event.data) });
  });

  eventSource.addEventListener('wordCount', (event: MessageEvent) => {
    onUpdate({ type: 'wordCount', data: JSON.parse(event.data) });
  });

  eventSource.addEventListener('lighthouse', (event: MessageEvent) => {
    onUpdate({ type: 'lighthouse', data: JSON.parse(event.data) });
  });

  eventSource.addEventListener('imageAlt', (event: MessageEvent) => {
    onUpdate({ type: 'imageAlt', data: JSON.parse(event.data) });
  });

  eventSource.addEventListener('brokenLinks', (event: MessageEvent) => {
    onUpdate({ type: 'brokenLinks', data: JSON.parse(event.data) });
  });

  eventSource.addEventListener('done', () => {
    onComplete();
    eventSource.close();
  });

  eventSource.addEventListener('error', (event: MessageEvent) => {
    onError(JSON.parse(event.data));
    eventSource.close();
  });

  return () => {
    eventSource.close();
  };
}