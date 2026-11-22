import { useRef, useState } from "react";
import { ImageInputPanel } from "../../../components/ui/ImageInputPanel.jsx";
import { ImagePredictionResult } from "../../../components/ui/ImagePredictionResult.jsx";
import { useLanguage } from "../../../context/useLanguage.js";
import { API_URL } from "../../../config/settings.js";
import { getRandomImageUrl } from "../../../services/mediaService.js";
import { sendFileToAPI } from "../../../utils/fileApi.js";
import { useInstanceSegmentationClassPreview } from "../hooks/useInstanceSegmentationClassPreview.js";

const normalizeClassName = (className) => String(className ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();

const getConfiguredClassCode = (className, classCodes = {}) => (
    Object.entries(classCodes).find(([name]) => (
        normalizeClassName(name) === normalizeClassName(className)
    ))?.[1]
);

const matchesSelectedClass = (instance, selectedClass, classCodes) => {
    const predictedClass = instance.class_name ?? instance.class;
    const selectedCode = getConfiguredClassCode(selectedClass, classCodes);
    const predictedCode = getConfiguredClassCode(predictedClass, classCodes);

    return selectedCode && predictedCode
        ? selectedCode === predictedCode
        : normalizeClassName(predictedClass) === normalizeClassName(selectedClass);
};

export const InstanceSegmentationImage = ({ model, onChange, onPredictionStart }) => {
    const { t } = useLanguage();
    const fetchInstanceSegmentationClassPreview = useInstanceSegmentationClassPreview();
    const [result, setResult] = useState(null);
    const [file, setFile] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [randomClass, setRandomClass] = useState("");
    const [isPredictionPending, setIsPredictionPending] = useState(false);
    const sourceRef = useRef(null);
    const endpoint = `${API_URL}/api/${model.apiPath ?? "instance_segmentation"}/predict`;
    const instances = Array.isArray(result) ? result : [];
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
                `${endpoint}?${new URLSearchParams({ conf: String(nextThreshold), model: model.apiModel ?? "yolo26x-seg" })}`,
                "source"
            );
            handleResult(nextResult, file, "file");
            return;
        }
        if (imageUrl) {
            const response = await fetch(`${endpoint}?${new URLSearchParams({
                source: imageUrl,
                conf: String(nextThreshold),
                model: model.apiModel ?? "yolo26x-seg",
            })}`);
            const nextResult = await response.json();
            if (!response.ok) throw new Error(nextResult?.detail ?? "Instance-segmentation prediction failed.");
            handleResult(nextResult, imageUrl, "url");
        }
    };

    const handleResult = (nextResult, source, sourceType) => {
        setResult(nextResult);
        setIsPredictionPending(false);
        onChange?.(nextResult, source);
        if (sourceType === "file") {
            setFile(source);
            setImageUrl("");
            sourceRef.current = source;
        }
        if (sourceType === "url") {
            setFile(null);
            sourceRef.current = source;
        }
    };
    const handleInputResult = (nextResult, source) => {
        const predictionSource = source instanceof File
            ? source
            : sourceRef.current instanceof File ? sourceRef.current : source ?? sourceRef.current;
        handleResult(nextResult, predictionSource, predictionSource instanceof File ? "file" : "url");
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
                queryParamName="source"
                queryParams={{ model: model.apiModel ?? "yolo26x-seg" }}
                onResult={handleInputResult}
                randomImageLabel={t("ui.randomImage")}
                randomImageLoadingLabel={t("ui.loadingRandomImage")}
                randomClassLabel={t("ui.randomClass")}
                onRandomImage={() => model.testImageDirectory
                    ? fetchInstanceSegmentationClassPreview(model, null, { output: "json" })
                    : getRandomImageUrl(model)}
                onRandomClassChange={setRandomClass}
                randomClassMatched={randomClass
                    ? instances.some((instance) => matchesSelectedClass(
                        instance,
                        randomClass,
                        model.testImageClassCodes
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
                    count={instances.length}
                    polygons={instances}
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
