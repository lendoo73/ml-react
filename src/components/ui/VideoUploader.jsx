import { useState, useCallback, useRef } from "react";
import { waitForVideoJob } from "../../services/videoJobService.js";
import { appendQueryParams } from "../../utils/appendQueryParams.js";

export const VideoUploader = ({
    label = "Upload a video",
    buttonText = "Choose video",
    accept = "video/mp4,video/webm,video/ogg",
    endpoint,
    fieldName = "video",
    onResult,
    onError,
    onLoadingChange,
    onPredictionStart,
    video,
    onVideoChange,
    ariaLabel = "Upload a video in video/mp4,video/webm,video/ogg format",
    disabled = false,
    onProgressChange,
    queryParams = {},
    formFields = {},
    validateFile,
    loadingLabel = "Uploading...",
}) => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const inputRef = useRef(null);

    const sendVideoToAPI = useCallback(async (videoFile, url) => {
        const formData = new FormData();
        formData.append(fieldName, videoFile);
        Object.entries(formFields).forEach(([name, value]) => {
            if (Array.isArray(value)) {
                value.forEach((item) => formData.append(name, String(item)));
                return;
            }
            if (value != null) formData.append(name, String(value));
        });

        const requestUrl = new URL(url, window.location.href);
        appendQueryParams(requestUrl.searchParams, queryParams);
        const res = await fetch(requestUrl, {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
        const response = await res.json();
        if (response.job_id) {
            setProgress(0);
            return waitForVideoJob(url, response.job_id, (value) => {
                setProgress(value);
                onProgressChange?.(value);
            });
        }
        return response;
    }, [fieldName, formFields, onProgressChange, queryParams]);


    const handleChange = useCallback(
        async (e) => {
            const selected = e.target.files?.[0] || null;
            const validationError = selected ? validateFile?.(selected) : "";
            if (validationError) {
                onVideoChange?.(null);
                onError?.(validationError);
                e.target.value = "";
                return;
            }
            onVideoChange?.(selected);
            e.target.value = "";

            if (selected && endpoint && onResult) {
                setLoading(true);
                setProgress(0);
                onPredictionStart?.();
                onLoadingChange?.(true);
                try {
                    const result = await sendVideoToAPI(selected, endpoint);
                    onResult(result);
                } catch (err) {
                    console.error(err);
                    onError?.(err.message || "Failed to upload video.");
                } finally {
                    setLoading(false);
                    onLoadingChange?.(false);
                }
            }
        },
        [endpoint, onResult, onError, onLoadingChange, onPredictionStart, onVideoChange, sendVideoToAPI, validateFile]
    );

    return (
        <label
            className="
                relative flex flex-col items-center justify-center
                w-full max-w-md p-6
                border-2 border-dashed rounded-xl cursor-pointer
                border-gray-400 hover:bg-gray-200
                dark:border-gray-600 dark:hover:bg-gray-800
                transition
            "
            style={disabled || loading ? { pointerEvents: "none", opacity: 0.6 } : undefined}
            aria-disabled={disabled || loading}
            aria-label={ariaLabel || label}
        >
            <span className="text-sm mb-2 text-gray-600 dark:text-gray-400">{label}</span>

            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={accept}
                onChange={handleChange}
                onClick={(e) => { e.currentTarget.value = null; }}
                disabled={disabled || loading}
            />

            <span
                className="
                    px-4 py-2 text-sm font-medium rounded-lg
                    bg-gray-800 text-gray-100
                    dark:bg-gray-200 dark:text-gray-900
                "
            >{loading ? (progress > 0 ? `${progress}%` : loadingLabel) : buttonText}</span>
            {loading ? (
                <span
                    className="mt-3 h-6 w-6 animate-spin rounded-full border-4 border-gray-400 border-t-blue-600"
                    aria-label="Uploading"
                />
            ) : null}

            {video && !loading && (
                <p className="text-sm text-gray-700 dark:text-gray-400 mt-2">
                    {video.name}
                </p>
            )}
        </label>
    );
};
