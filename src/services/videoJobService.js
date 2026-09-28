/**
 * Wait for a backend video job and resolve with its completed result.
 *
 * @param {string} endpoint - The video submission endpoint.
 * @param {string} jobId - The job identifier returned by the API.
 * @param {(progress: number) => void} onProgress - Progress callback.
 * @returns {Promise<unknown>} The completed prediction result.
 */
export const waitForVideoJob = (endpoint, jobId, onProgress = () => {}) => new Promise((resolve, reject) => {
    const eventSource = new EventSource(`${endpoint}/progress/${encodeURIComponent(jobId)}`);
    let settled = false;

    const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        eventSource.close();
        callback(value);
    };

    eventSource.onmessage = (event) => {
        try {
            const payload = JSON.parse(event.data);
            onProgress(Number(payload.progress) || 0);
            if (payload.status === "completed") finish(resolve, payload.result);
            if (payload.status === "failed") finish(reject, new Error(payload.error || "Video prediction failed."));
        } catch {
            finish(reject, new Error("Invalid progress response from the video prediction service."));
        }
    };

    eventSource.onerror = () => {
        finish(reject, new Error("The video prediction progress connection was lost."));
    };
});
