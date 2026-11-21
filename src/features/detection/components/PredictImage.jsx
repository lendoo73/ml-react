import { ImageInputPanel } from "../../../components/ui/ImageInputPanel.jsx";
import { ImagePredictionResult } from "../../../components/ui/ImagePredictionResult.jsx";
import { useLanguage } from "../../../context/useLanguage.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_URL } from "../../../config/settings.js";
import { getRandomImageUrl } from "../../../services/mediaService.js";
import { sendFileToAPI } from "../../../utils/fileApi.js";
import { useDetectionClassPreview } from "../hooks/useDetectionClassPreview.js";

const normalizeClassName = (className) => String(className ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const PredictImage = ({
    model,
    onChange,
    onPredictionStart,
    onPredictionPending,
    onPredictionControlsReady,
    randomMediaSearchTerms,
    showPredictionResult = true,
}) => {
    const [result, setResult] = useState(null);
    const [resultImage, setResultImage] = useState(null);
    const [file, setFile] = useState(null);
    const [imgUrl, setImgUrl] = useState("");
    const [inputMode, setInputMode] = useState("image");
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [randomClass, setRandomClass] = useState("");
    const [isPredictionPending, setIsPredictionPending] = useState(false);

    const { t } = useLanguage();
    const fetchClassPreview = useDetectionClassPreview();
    const endpointBase = `${API_URL}/api/${model.apiPath ?? "object_detection"}`;
    const fileEndpoint = `${endpointBase}/predict`;
    const urlEndpoint = `${endpointBase}/predict`;
    const detectionCount = useMemo(() => {
        if (model?.resultType === "classification") {
            if (Array.isArray(result)) return result.length;
            if (Array.isArray(result?.predictions)) return result.predictions.length;
            return 0;
        }

        return Array.isArray(result) ? result.length : 0;
    }, [model?.resultType, result]);
    const randomClassMatched = useMemo(() => {
        if (!randomClass) return undefined;
        const normalizedRandomClass = normalizeClassName(randomClass);
        const matchingClass = Object.entries(model.classSearchQueries ?? {}).find(([className, searchQuery]) => (
            normalizeClassName(className) === normalizedRandomClass
            || normalizeClassName(searchQuery) === normalizedRandomClass
        ))?.[0];
        const expectedClasses = new Set([
            normalizedRandomClass,
            ...(matchingClass ? [normalizeClassName(matchingClass)] : []),
        ]);
        const detections = Array.isArray(result)
            ? result
            : Array.isArray(result?.detections) ? result.detections : [];

        return detections.some((detection) => expectedClasses.has(
            normalizeClassName(detection.class_name ?? detection.class),
        ));
    }, [model.classSearchQueries, randomClass, result]);
    const handleSourcePredictionStart = () => {
        setConfidenceThreshold(0.5);
        setIsPredictionPending(true);
        onPredictionStart?.();
    };
    const rerunPrediction = useCallback(async (nextThreshold) => {
        setIsPredictionPending(true);
        onPredictionPending?.();
        const params = new URLSearchParams({ conf: String(nextThreshold), model: model.apiModel ?? "yolo26x" });
        if (file) {
            const nextResult = await sendFileToAPI(file, `${fileEndpoint}?${params.toString()}`, "source");
            setResult(nextResult);
            setIsPredictionPending(false);
            onChange?.(nextResult, file);
            return;
        }
        if (imgUrl) {
            const response = await fetch(`${urlEndpoint}?${new URLSearchParams({
                source: imgUrl,
                conf: String(nextThreshold),
                model: model.apiModel ?? "yolo26x",
            }).toString()}`);
            const nextResult = await response.json();
            if (!response.ok) throw new Error(nextResult?.detail ?? "Detection prediction failed.");
            setResult(nextResult);
            setIsPredictionPending(false);
            onChange?.(nextResult, imgUrl);
        }
    }, [file, fileEndpoint, imgUrl, model.apiModel, onChange, onPredictionPending, urlEndpoint]);

    useEffect(() => {
        onPredictionControlsReady?.(rerunPrediction);
    }, [onPredictionControlsReady, rerunPrediction]);

    const handleFileSelect = (f) => {
        setInputMode("image");
        setImgUrl("");
        setResult(null);
        setResultImage(null);
        setFile(f);
    };

    const handleFileResult = (r, selectedFile = file) => {
        setResult(r);
        setResultImage(selectedFile);
        setIsPredictionPending(false);
        onChange?.(r, selectedFile);
    };

    const handleUrlResult = (r, sourceUrl) => {
        const resolvedSourceUrl = sourceUrl ?? imgUrl;
        setInputMode("url");
        setFile(null);
        setImgUrl(resolvedSourceUrl);
        setResult(r);
        setResultImage(resolvedSourceUrl);
        setIsPredictionPending(false);
        onChange?.(r, resolvedSourceUrl);
    };

    return (
        <>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <ImageInputPanel
                    model={model}
                    file={file}
                    onFileSelect={handleFileSelect}
                    imageUrl={imgUrl}
                    setImageUrl={(value) => {
                        setInputMode("url");
                        setFile(null);
                        setResult(null);
                        setImgUrl(value);
                    }}
                    fileEndpoint={fileEndpoint}
                    urlEndpoint={urlEndpoint}
                    fileFieldName="source"
                    queryParamName="source"
                    queryParams={{
                        model: model.apiModel ?? "yolo26x",
                        ...(model.id === "yolo26-detect-official" ? { output: "json" } : {}),
                    }}
                    onResult={(result, sourceUrl) => (
                        inputMode === "image" ? handleFileResult(result, sourceUrl) : handleUrlResult(result, sourceUrl)
                    )}
                    randomImageLabel={t("ui.randomImage")}
                    randomImageLoadingLabel={t("ui.loadingRandomImage")}
                    randomClassLabel={t("ui.randomClass")}
                    onRandomImage={async () => {
                        const configuredClasses = randomMediaSearchTerms?.filter(Boolean);
                        const availableClasses = configuredClasses?.length
                            ? configuredClasses
                            : model.classes?.filter(Boolean) ?? [];
                        if (!availableClasses.length) return getRandomImageUrl(model, randomMediaSearchTerms);

                        const className = availableClasses[Math.floor(Math.random() * availableClasses.length)];
                        handleSourcePredictionStart();
                        return fetchClassPreview(model, className, "json");
                    }}
                    onRandomClassChange={setRandomClass}
                    randomClassMatched={randomClassMatched}
                    onPredictionStart={handleSourcePredictionStart}
                />
            </div>
            {showPredictionResult && result && model?.resultType !== "classification" ? (
                <div className={`mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${isPredictionPending ? "pointer-events-none select-none opacity-40 blur-sm" : ""}`}>
                    <ImagePredictionResult
                        image={resultImage}
                        result={result}
                        countLabel={model?.predictionLabel}
                        count={detectionCount}
                        boxes={result}
                        showLabel={t("image.showBoxes")}
                        hideLabel={t("image.hideBoxes")}
                        alt={t("image.uploaded")}
                        responseLabel={t("ui.apiResponse")}
                        imageWidth="max-w-none w-full"
                        showBoundaryToggle
                        boundaryBoxesDefault
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