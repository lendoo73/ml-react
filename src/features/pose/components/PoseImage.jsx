import { useRef, useState } from "react";
import { ImageInputPanel } from "../../../components/ui/ImageInputPanel.jsx";
import { useLanguage } from "../../../context/useLanguage.js";
import { API_URL } from "../../../config/settings.js";
import { getRandomImageUrl } from "../../../services/mediaService.js";
import { PosePredictionResult } from "./PosePredictionResult.jsx";
import { sendFileToAPI } from "../../../utils/fileApi.js";

export const PoseImage = ({ model, previewSearchTerms, onChange, onPredictionStart }) => {
    const { t } = useLanguage();
    const [result, setResult] = useState(null);
    const [file, setFile] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [isPredictionPending, setIsPredictionPending] = useState(false);
    const sourceRef = useRef(null);
    const fileEndpoint = `${API_URL}/api/pose_estimation/predict`;
    const urlEndpoint = `${API_URL}/api/pose_estimation/predict`;
    const handleSourcePredictionStart = () => {
        setConfidenceThreshold(0.5);
        setIsPredictionPending(true);
        onPredictionStart?.();
    };
    const rerunPrediction = async (nextThreshold) => {
        setIsPredictionPending(true);
        if (file) {
            const nextResult = await sendFileToAPI(file, `${fileEndpoint}?conf=${nextThreshold}`, "source");
            handleResult(nextResult, file, "file");
            return;
        }
        if (imageUrl) {
            const response = await fetch(`${urlEndpoint}?source=${encodeURIComponent(imageUrl)}&conf=${nextThreshold}`);
            const nextResult = await response.json();
            if (!response.ok) throw new Error(nextResult?.detail ?? "Pose prediction failed.");
            handleResult(nextResult, imageUrl, "url");
        }
    };

    const handleResult = (nextResult, source, sourceType) => {
        setResult(nextResult);
        setIsPredictionPending(false);
        onChange?.(nextResult, source);
        if (sourceType === "file") setImageUrl("");
        if (sourceType === "url") setFile(null);
    };

    return (
        <>
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <ImageInputPanel
                    model={model}
                    file={file}
                    onFileSelect={(nextFile) => {
                        setFile(nextFile);
                        sourceRef.current = nextFile;
                        setImageUrl("");
                        setResult(null);
                    }}
                    imageUrl={imageUrl}
                    setImageUrl={(value) => {
                        setImageUrl(value);
                        sourceRef.current = value;
                        setFile(null);
                        setResult(null);
                    }}
                    fileEndpoint={fileEndpoint}
                    urlEndpoint={urlEndpoint}
                    queryParamName="source"
                    onResult={(nextResult, sourceUrl) => handleResult(
                        nextResult,
                        sourceRef.current instanceof File ? sourceRef.current : sourceUrl ?? sourceRef.current,
                        sourceRef.current instanceof File ? "file" : "url"
                    )}
                    randomImageLabel={t("ui.randomImage")}
                    randomImageLoadingLabel={t("ui.loadingRandomImage")}
                    onRandomImage={() => getRandomImageUrl(model, previewSearchTerms)}
                    randomClassLabel={t("ui.randomImageQuery")}
                    randomClassMatched={Array.isArray(result) && result.length > 0}
                    onPredictionStart={handleSourcePredictionStart}
                />
            </div>
            {result ? (
                <div className={`mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${isPredictionPending ? "pointer-events-none select-none opacity-40 blur-sm" : ""}`}>
                    <PosePredictionResult
                        image={file ?? imageUrl}
                        result={result}
                        countLabel={model.predictionLabel}
                        onImageLoad={() => null}
                        keypointLabels={model.keypoints}
                        showLabel={t("image.showSkeleton")}
                        hideLabel={t("image.hideSkeleton")}
                        alt={t("image.uploaded")}
                        confidenceThreshold={confidenceThreshold}
                        onConfidenceThresholdChange={(nextThreshold) => {
                            setConfidenceThreshold(nextThreshold);
                            void rerunPrediction(nextThreshold);
                        }}
                    />
                </div>
            ) : null}
        </>
    );
};
