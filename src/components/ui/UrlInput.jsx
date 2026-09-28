import { useState } from "react";
import { waitForVideoJob } from "../../services/videoJobService.js";
import { useLanguage } from "../../context/useLanguage.js";

export const UrlInput = ({
    label,
    buttonText,
    placeholder,
    imgUrl,
    setImgUrl,
    endpoint,
    onResult,
    queryParamName = "img_url",
    queryParams = {},
    inputId = "model",
    disabled = false,
    onLoadingChange,
    onPredictionStart,
    mediaType,
    exampleUrl,
    exampleLabel = "Use sample video",
    exampleLoadingLabel = "Loading sample video...",
    onExampleClick,
    randomClassLabel = "Random class",
    randomClassMatched,
    onRandomClassChange,
    onProgressChange,
}) => {
    const { t } = useLanguage();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [exampleLoading, setExampleLoading] = useState(false);
    const [selectedRandomClass, setSelectedRandomClass] = useState("");

    const handlePredict = async (url = imgUrl) => {
        const urlToPredict = url.trim();
        setError("");
        if (!urlToPredict) {
            setError(t("ui.enterUrl"));
            return;
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(urlToPredict);
        } catch {
            setError("Enter a valid URL.");
            return;
        }

        const path = parsedUrl.pathname.toLowerCase();
        const isImageUrl = /\.(apng|avif|gif|jpe?g|png|webp|bmp|svg)$/i.test(path);
        const isVideoUrl = /\.(avi|m4v|mkv|mov|mp4|mpeg|mpg|ogv|webm|wmv)$/i.test(path);
        if ((mediaType === "image" && isVideoUrl) || (mediaType === "video" && isImageUrl)) {
            setError(mediaType === "video"
                ? "Please enter a video URL."
                : "Please enter an image URL.");
            return;
        }

        setLoading(true);
        setProgress(0);
        onPredictionStart?.();
        onLoadingChange?.(true);
        const imagePreload = mediaType === "image" ? new Image() : null;
        if (imagePreload) imagePreload.src = urlToPredict;

        try {
            const params = new URLSearchParams({
                [queryParamName]: urlToPredict,
                ...queryParams,
            });
            const res = await fetch(`${endpoint}?${params.toString()}`);
            const responseText = await res.text();
            let data = {};
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch {
                data = { detail: responseText };
            }

            if (!res.ok) {
                const detail = Array.isArray(data.detail)
                    ? data.detail.map((item) => item.msg).join(", ")
                    : data.detail;
                const message = detail || `Request failed with status ${res.status}`;
                throw new Error(res.status === 400 ? `Bad request: ${message}` : message);
            }

            const result = data.job_id && mediaType === "video"
                ? await waitForVideoJob(endpoint, data.job_id, (value) => {
                    setProgress(value);
                    onProgressChange?.(value);
                })
                : data;
            onResult(result, urlToPredict);
        } catch (requestError) {
            console.error("Error predicting media URL:", requestError);
            setError(requestError.message || "Unable to process this URL.");
        } finally {
            setLoading(false);
            onLoadingChange?.(false);
        }
    };

    return (
        <div className="w-full max-w-md flex flex-wrap gap-3 items-center">
            <label className="sr-only" htmlFor={`url-input-${inputId}`}>{label}</label>
            <input
                id={`url-input-${inputId}`}
                type="text"
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                disabled={disabled || loading}
                placeholder={placeholder}
                className="
                    flex-1 rounded-md border border-gray-300 p-2
                    bg-gray-200 text-gray-900 placeholder:text-gray-500
                    dark:border-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-300
                "
            />

            <button
                type="button"
                onClick={() => handlePredict()}
                disabled={disabled || loading}
                className="
                    cursor-pointer rounded-md px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50
                    bg-blue-600 text-white
                    dark:bg-blue-400 dark:text-gray-900
                "
            >            {loading ? (progress > 0 ? `${progress}%` : "Loading...") : buttonText ?? label}</button>
            {exampleUrl || onExampleClick ? (
                <button
                    type="button"
                    onClick={async () => {
                        setError("");
                        setExampleLoading(true);
                        try {
                            const selection = onExampleClick ? await onExampleClick() : { url: exampleUrl };
                            const nextUrl = typeof selection === "string" ? selection : selection.url;
                            setSelectedRandomClass(typeof selection === "string" ? "" : selection.query ?? "");
                            onRandomClassChange?.(typeof selection === "string" ? "" : selection.query ?? "");
                            setImgUrl(nextUrl);
                            await handlePredict(nextUrl);
                        } catch (exampleError) {
                            console.error("Error loading sample media:", exampleError);
                            setError(exampleError.message || "Unable to load a sample video.");
                        } finally {
                            setExampleLoading(false);
                        }
                    }}
                    disabled={disabled || loading || exampleLoading}
                    className="basis-full text-left text-sm text-blue-600 underline hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-300 dark:hover:text-blue-200"
                >
                    {exampleLoading ? exampleLoadingLabel : exampleUrl ? `${exampleLabel}: ${exampleUrl}` : exampleLabel}
                </button>
            ) : null}
            {selectedRandomClass ? (
                <p className={`basis-full rounded-lg border px-3 py-2 text-base font-medium ${
                    randomClassMatched === true
                        ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-300"
                        : randomClassMatched === false
                            ? "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300"
                            : "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}>
                    {randomClassMatched === true
                        ? "✓ "
                        : randomClassMatched === false ? "✕ " : ""}
                    {randomClassLabel}: <span className="font-bold">{selectedRandomClass}</span>
                </p>
            ) : null}
            {error ? (
            <p className="basis-full text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
            </p>
            ) : null}
        </div>
    );
};
