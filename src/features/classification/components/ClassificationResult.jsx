import { useMemo } from "react";
import { useLanguage } from "../../../context/useLanguage.js";

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

export const ClassificationResult = ({ image, result, onImageLoad }) => {
    const { t } = useLanguage();
    const predictions = useMemo(() => getPredictions(result), [result]);
    const topPrediction = predictions[0] ?? null;

    if (!image && predictions.length === 0) return null;

    const imageUrl = typeof image === "string" ? image : image ? URL.createObjectURL(image) : "";

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={t("ui.classificationPreviewAlt")}
                        className="max-h-[32rem] w-full bg-black object-contain"
                        onLoad={onImageLoad}
                    />
                ) : null}
            </div>

            <div className="space-y-4">
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
        </div>
    );
};
