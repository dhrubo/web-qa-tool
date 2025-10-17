"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runQAChecks = runQAChecks;
function runQAChecks(url, searchWords, selectedChecks, viewportWidth, onUpdate, onError, onComplete) {
    const eventSource = new EventSource(`/api/qa-stream?${new URLSearchParams({
        url,
        searchWords: JSON.stringify(searchWords),
        selectedChecks: JSON.stringify(selectedChecks),
        viewportWidth: viewportWidth.toString(),
    })}`);
    eventSource.addEventListener('status', (event) => {
        onUpdate({ type: 'status', data: JSON.parse(event.data) });
    });
    eventSource.addEventListener('screenshot', (event) => {
        onUpdate({ type: 'screenshot', data: JSON.parse(event.data) });
    });
    eventSource.addEventListener('screenshotAlpha', (event) => {
        onUpdate({ type: 'screenshotAlpha', data: JSON.parse(event.data) });
    });
    eventSource.addEventListener('wordCount', (event) => {
        onUpdate({ type: 'wordCount', data: JSON.parse(event.data) });
    });
    eventSource.addEventListener('lighthouse', (event) => {
        onUpdate({ type: 'lighthouse', data: JSON.parse(event.data) });
    });
    eventSource.addEventListener('imageAlt', (event) => {
        onUpdate({ type: 'imageAlt', data: JSON.parse(event.data) });
    });
    eventSource.addEventListener('brokenLinks', (event) => {
        onUpdate({ type: 'brokenLinks', data: JSON.parse(event.data) });
    });
    eventSource.addEventListener('done', () => {
        onComplete();
        eventSource.close();
    });
    eventSource.addEventListener('error', (event) => {
        onError(JSON.parse(event.data));
        eventSource.close();
    });
    return () => {
        eventSource.close();
    };
}
