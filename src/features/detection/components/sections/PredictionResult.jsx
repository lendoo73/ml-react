import { ImagePredictionResult } from "../../../../components/ui/ImagePredictionResult.jsx";
import { useLanguage } from "../../../../context/useLanguage.js";

export const PredictionResult = ({ result, image, model, isPending, confidenceThreshold, onConfidenceThresholdChange }) => {
    const { t } = useLanguage();
    if (!result || !image) return null;
    const detections = Array.isArray(result) ? result : result.detections ?? [];
    const visibleDetections = detections.filter((detection) => {
        const rawConfidence = Number(detection.confidence ?? detection.score ?? detection.probability);
        if (!Number.isFinite(rawConfidence)) return true;
        const confidence = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;
        return confidence >= confidenceThreshold;
    });

    return (
        <section className={`rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${isPending ? "pointer-events-none select-none opacity-40 blur-sm" : ""}`}>
            <ImagePredictionResult
                image={image}
                result={result}
                countLabel={model.predictionLabel}
                count={visibleDetections.length}
                boxes={visibleDetections}
                showLabel={t("image.showBoxes")}
                hideLabel={t("image.hideBoxes")}
                alt={t("image.uploaded")}
                responseLabel={t("ui.apiResponse")}
                showBoundaryToggle
                showOrientedBoxToggle={model?.supportsOrientedBoxes ?? model?.id === "yolo26-obb-official"}
                boundaryBoxesDefault
                showResponse={false}
                confidenceThreshold={confidenceThreshold}
                onConfidenceThresholdChange={onConfidenceThresholdChange}
            />
        </section>
    );
};
