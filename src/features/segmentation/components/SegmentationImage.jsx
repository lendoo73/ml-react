import { useRef, useState } from "react";
import { ImageInputPanel } from "../../../components/ui/ImageInputPanel.jsx";
import { ImagePredictionResult } from "../../../components/ui/ImagePredictionResult.jsx";
import { useLanguage } from "../../../context/useLanguage.js";
import { API_URL } from "../../../config/settings.js";
import { getRandomImageUrl } from "../../../services/mediaService.js";
import { sendFileToAPI } from "../../../utils/fileApi.js";

export const SegmentationImage = ({ model, onChange, onPredictionStart }) => {
    const { t } = useLanguage();
    const [result, setResult] = useState(null);
    const [file, setFile] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [randomClass, setRandomClass] = useState("");
    const [isPredictionPending, setIsPredictionPending] = useState(false);
    const sourceRef = useRef(null);
    const endpoint = `${API_URL}/api/${model.apiPath}/${model.endpoints.image}`;
    const segmentations = Array.isArray(result) ? result : [];
    const handleSourcePredictionStart = () => {
        setConfidenceThreshold(0.5);
        setIsPredictionPending(true);
        onPredictionStart?.();
    };
    const rerunPrediction = async (nextThreshold) => {
        setIsPredictionPending(true);
        if (file) {
            const nextResult = await sendFileToAPI(
                file,
                `${endpoint}?conf=${nextThreshold}`,
                model.fileFieldName
            );
            handleResult(nextResult, file, "file");
            return;
        }
        if (imageUrl) {
            const response = await fetch(`${endpoint}?source=${encodeURIComponent(imageUrl)}&conf=${nextThreshold}`);
            const nextResult = await response.json();
            if (!response.ok) throw new Error(nextResult?.detail ?? "Segmentation prediction failed.");
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
                fileEndpoint={endpoint}
                urlEndpoint={endpoint}
                onResult={(nextResult, sourceUrl) => handleResult(nextResult, sourceRef.current instanceof File ? sourceRef.current : sourceUrl ?? sourceRef.current, sourceRef.current instanceof File ? "file" : "url")}
                randomImageLabel={t("ui.randomImage")}
                randomImageLoadingLabel={t("ui.loadingRandomImage")}
                randomClassLabel={t("ui.randomClass")}
                onRandomImage={() => getRandomImageUrl(model)}
                onRandomClassChange={setRandomClass}
                randomClassMatched={randomClass
                    ? segmentations.some((segmentation) => (
                        String(segmentation.class_name ?? segmentation.class ?? "")
                            .toLowerCase()
                            .replace(/[_-]+/g, " ")
                            .trim() === randomClass.toLowerCase().replace(/[_-]+/g, " ").trim()
                    ))
                    : undefined}
                onPredictionStart={handleSourcePredictionStart}
            />
            </div>
            {result ? (
                <div className={`mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${isPredictionPending ? "pointer-events-none select-none opacity-40 blur-sm" : ""}`}>
                <ImagePredictionResult
                    image={file ?? imageUrl}
                    result={result}
                    countLabel={model.predictionLabel}
                    count={segmentations.length}
                    polygons={segmentations}
                    hideLabel={t("image.hideMasks")}
                    showLabel={t("image.showMasks")}
                    alt={t("image.uploaded")}
                    responseLabel={t("ui.apiResponse")}
                    imageWidth="max-w-none w-full"
                    showBoundaryToggle
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
