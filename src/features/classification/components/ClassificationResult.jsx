import { Maximize, Minimize } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../../context/useLanguage.js";
import { ConfidenceThresholdControl } from "../../../components/ui/ConfidenceThresholdControl.jsx";
import { FullscreenPanelToggle } from "../../../components/ui/FullscreenMediaLayout.jsx";

const getPredictions = (result) => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.predictions)) return result.predictions;
    if (Array.isArray(result?.results)) return result.results;
    return [];
};

const getClassName = (prediction) => (
    prediction.class_name
    ?? prediction.class
    ?? prediction.label
    ?? prediction.name
    ?? "unknown"
);

const getConfidence = (prediction) => {
    const rawValue = prediction.confidence ?? prediction.score ?? prediction.probability ?? 0;
    return rawValue > 1 ? rawValue / 100 : rawValue;
};

export const ClassificationResult = ({ image, result, onImageLoad, confidenceThreshold = 0.5, onConfidenceThresholdChange }) => {
    const { t } = useLanguage();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenControls, setShowFullscreenControls] = useState(true);
    const imageContainerRef = useRef(null);
    const predictions = useMemo(() => getPredictions(result), [result]);
    const topPrediction = predictions[0] ?? null;

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentElementFullscreen = document.fullscreenElement === imageContainerRef.current;
            setIsFullscreen(isCurrentElementFullscreen);
            if (isCurrentElementFullscreen) setShowFullscreenControls(true);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }

        await imageContainerRef.current?.requestFullscreen({ navigationUI: "hide" });
    };

    if (!image && predictions.length === 0) return null;

    const imageUrl = typeof image === "string" ? image : image ? URL.createObjectURL(image) : "";

    return (
        <div
            ref={imageContainerRef}
            className={isFullscreen
                ? "relative block h-full w-full overflow-hidden bg-black"
                : "relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"}
        >
            <div
                className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 ${isFullscreen
                    ? "absolute inset-0 flex h-full w-full items-center justify-center rounded-none border-0 bg-black shadow-none"
                    : ""}`}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={t("ui.classificationPreviewAlt")}
                        className={`max-h-128 w-full bg-black object-contain ${isFullscreen ? "h-full max-h-full w-full" : ""}`}
                        onLoad={onImageLoad}
                    />
                ) : null}
            </div>

            <div className={`space-y-4 ${isFullscreen
                ? "absolute right-4 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-80 -translate-y-1/2 overflow-y-auto rounded-xl border border-white/30 bg-black/60 p-4 text-white shadow-lg backdrop-blur-sm"
                : ""}`}
                hidden={isFullscreen && !showFullscreenControls}
            >
                <div className="flex justify-start">
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        aria-label={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                        title={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                    >
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </button>
                    {isFullscreen ? <FullscreenPanelToggle visible onClick={() => setShowFullscreenControls(false)} /> : null}
                </div>
                {onConfidenceThresholdChange ? (
                    <ConfidenceThresholdControl
                        value={confidenceThreshold}
                        onChange={onConfidenceThresholdChange}
                    />
                ) : null}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("ui.topPrediction")}</div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                        {topPrediction ? getClassName(topPrediction) : t("ui.noPredictions")}
                    </div>
                    {topPrediction ? (
                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                            {t("ui.confidence")}: {(getConfidence(topPrediction) * 100).toFixed(1)}%
                        </div>
                    ) : null}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("ui.rankedPredictions")}</div>
                    <div className="mt-4 space-y-3">
                        {predictions.length > 0 ? predictions.map((prediction, index) => {
                            const confidence = getConfidence(prediction);

                            return (
                                <div key={`${getClassName(prediction)}-${index}`} className="space-y-1">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="font-medium text-gray-800 dark:text-gray-100">{getClassName(prediction)}</span>
                                        <span className="text-gray-500 dark:text-gray-400">{(confidence * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                        <div
                                            className="h-2 rounded-full bg-blue-600"
                                            style={{ width: `${Math.max(confidence * 100, 2)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t("ui.noPredictions")}</p>
                        )}
                    </div>
                </div>
            </div>
            {isFullscreen && !showFullscreenControls ? (
                <FullscreenPanelToggle visible={false} onClick={() => setShowFullscreenControls(true)} />
            ) : null}
        </div>
    );
};
