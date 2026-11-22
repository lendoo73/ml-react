import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "../../../config/settings.js";
import { extractPatientScanSlices } from "../utils/extractPatientScanSlices.js";

const initialState = {
    scan: null,
    slices: [],
    apiResponses: [],
    currentIndex: 0,
    status: "idle",
    progress: 0,
    error: "",
};

const waitForBatchJob = (endpoint, jobId, signal, onProgress) => new Promise((resolve, reject) => {
    if (signal.aborted) {
        reject(new DOMException("Request aborted", "AbortError"));
        return;
    }
    const source = new EventSource(`${endpoint}/progress/${encodeURIComponent(jobId)}`);
    const finish = (callback, value) => {
        source.close();
        signal.removeEventListener("abort", abort);
        callback(value);
    };
    const abort = () => finish(reject, new DOMException("Request aborted", "AbortError"));

    signal.addEventListener("abort", abort, { once: true });
    source.onmessage = ({ data }) => {
        try {
            const payload = JSON.parse(data);
            onProgress(Number(payload.progress) || 0);
            if (payload.status === "completed") {
                const isValidResult = Array.isArray(payload.result) && payload.result.every((item) => (
                    item && typeof item.filename === "string" && Array.isArray(item.predictions)
                ));
                if (!isValidResult) throw new Error("Invalid batch prediction result.");
                finish(resolve, payload.result);
            } else if (payload.status === "failed") {
                finish(reject, new Error(payload.error || "Batch prediction failed."));
            }
        } catch (error) {
            finish(reject, error instanceof SyntaxError
                ? new Error("Invalid batch prediction progress response.")
                : error);
        }
    };
    source.onerror = () => finish(reject, new Error("The batch prediction progress connection was lost."));
});

const buildSliceResults = (slices, predictions) => {
    const byFilename = new Map(predictions.map((item) => [item.filename, item]));
    return slices.map((slice) => ({
        ...slice,
        prediction: byFilename.get(slice.filename) ?? null,
    }));
};

export const usePatientScanPrediction = (model) => {
    const [state, setState] = useState(initialState);
    const requestRef = useRef(null);

    const predict = useCallback(async () => {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        const { signal } = controller;
        setState({ ...initialState, status: "loading" });

        try {
            const metadataResponse = await fetch(`${API_URL}/api/brain_tumor/random/glioma`, { signal });
            if (signal.aborted) return;
            if (!metadataResponse.ok) throw new Error(`Patient scan request failed (HTTP ${metadataResponse.status}).`);
            const scan = await metadataResponse.json();
            if (signal.aborted) return;
            if (!scan?.scan?.series_instance_uid || !scan.stack_url) {
                throw new Error("The patient scan response is missing its series ID or ZIP link.");
            }
            setState((current) => ({ ...current, scan, status: "downloading" }));

            const stackUrl = new URL(scan.stack_url, `${API_URL}/`).href;
            const archiveResponse = await fetch(stackUrl, { signal });
            if (signal.aborted) return;
            if (!archiveResponse.ok) throw new Error(`Patient scan ZIP download failed (HTTP ${archiveResponse.status}).`);
            const archive = await archiveResponse.blob();
            const slices = await extractPatientScanSlices(archive);
            if (signal.aborted) return;
            const zipFile = new File([archive], `${scan.scan.series_instance_uid}.zip`, {
                type: "application/x-zip-compressed",
            });
            setState((current) => ({ ...current, slices, status: "predicting", progress: 0 }));

            const endpoint = `${API_URL}/api/${model.apiPath ?? "segmentation"}/${model.endpoints.batch}`;
            const formData = new FormData();
            formData.append("source", zipFile);
            const requestUrl = new URL(endpoint);
            requestUrl.searchParams.set("model", model.apiModel ?? "brain-tumor");
            const predictionResponse = await fetch(requestUrl, { method: "POST", body: formData, signal });
            if (signal.aborted) return;
            if (!predictionResponse.ok) {
                throw new Error(`Batch prediction request failed (HTTP ${predictionResponse.status}).`);
            }
            const job = await predictionResponse.json();
            if (signal.aborted) return;
            if (!job?.job_id) throw new Error("The batch prediction response did not include a job ID.");

            const predictions = await waitForBatchJob(endpoint, job.job_id, signal, (progress) => {
                if (requestRef.current === controller) {
                    setState((current) => ({ ...current, progress }));
                }
            });
            if (signal.aborted) return;
            setState((current) => ({
                ...current,
                slices: buildSliceResults(current.slices, predictions),
                apiResponses: predictions,
                currentIndex: 0,
                status: "completed",
                progress: 100,
            }));
        } catch (error) {
            if (!signal.aborted && error.name !== "AbortError" && requestRef.current === controller) {
                setState((current) => ({ ...current, status: "error", error: error.message }));
            }
        }
    }, [model.apiModel, model.apiPath, model.endpoints.batch]);

    const selectSlice = useCallback((currentIndex) => {
        setState((current) => ({ ...current, currentIndex }));
    }, []);

    useEffect(() => () => requestRef.current?.abort(), []);

    return { ...state, predict, selectSlice };
};
