import { ClassificationResult } from "../ClassificationResult.jsx";

export const PredictionResult = ({
    resultRef,
    isPending,
    image,
    result,
    onImageLoad,
    confidenceThreshold,
    onConfidenceThresholdChange,
}) => {
    if (!result && !image) return null;

    return (
        <div
            ref={resultRef}
            className={`rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${isPending ? "pointer-events-none select-none opacity-40 blur-sm" : ""}`}
        >
            <ClassificationResult
                image={image}
                result={result}
                onImageLoad={onImageLoad}
                confidenceThreshold={confidenceThreshold}
                onConfidenceThresholdChange={onConfidenceThresholdChange}
            />
        </div>
    );
};
