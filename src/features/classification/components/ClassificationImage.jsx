import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";
import { getRandomImageUrl } from "../../../services/mediaService.js";
import { ImageInputPanel } from "../../../components/ui/ImageInputPanel.jsx";
import { sendFileToAPI } from "../../../utils/fileApi.js";
import { selectRandomTestImage } from "../utils/selectRandomTestImage.js";

export const ClassificationImage = ({
    model,
    onChange,
    onPredictionStart,
    onPredictionPending = onPredictionStart,
    onPredictionControlsReady,
}) => {
    const [file, setFile] = useState(null);
    const fileRef = useRef(null);
    const [imageUrl, setImageUrl] = useState("");
    const [randomClass, setRandomClass] = useState("");
    const [latestResult, setLatestResult] = useState([]);
    const { t } = useLanguage();
    const endpoint = `${API_URL}/api/${model.apiPath ?? "classification"}/predict`;
    const handleResult = useCallback((nextResult, sourceUrl) => {
        const predictions = Array.isArray(nextResult) ? nextResult : nextResult?.predictions ?? [];
        setLatestResult(predictions);
        onChange(nextResult, sourceUrl);
    }, [onChange]);

    useEffect(() => {
        const rerunPrediction = async (confidenceThreshold) => {
            const params = new URLSearchParams({
                conf: String(confidenceThreshold),
                model: model.apiModel ?? "yolo26x-cls",
            });
            onPredictionPending?.();

            if (fileRef.current) {
                const result = await sendFileToAPI(
                    fileRef.current,
                    `${endpoint}?${params.toString()}`,
                    model.fileFieldName
                );
                handleResult(result, fileRef.current);
                return;
            }

            if (imageUrl) {
                const response = await fetch(`${endpoint}?${new URLSearchParams({
                    source: imageUrl,
                    output: "json",
                    conf: String(confidenceThreshold),
                    model: model.apiModel ?? "yolo26x-cls",
                }).toString()}`);
                const result = await response.json();
                if (!response.ok) throw new Error(result?.detail ?? "Classification prediction failed.");
                handleResult(result, imageUrl);
            }
        };

        onPredictionControlsReady?.(rerunPrediction);
        return () => onPredictionControlsReady?.(null);
    }, [endpoint, handleResult, imageUrl, model.apiModel, model.fileFieldName, onPredictionControlsReady, onPredictionPending]);

    const handleFileSelect = (selectedFile) => {
        setFile(selectedFile);
        fileRef.current = selectedFile;
        setImageUrl("");
    };

    return (
        <div className="flex flex-col items-center">
            <ImageInputPanel
                model={model}
                file={file}
                onFileSelect={handleFileSelect}
                imageUrl={imageUrl}
                setImageUrl={(value) => {
                    setImageUrl(value);
                    setFile(null);
                    fileRef.current = null;
                }}
                fileEndpoint={endpoint}
                urlEndpoint={endpoint}
                queryParams={{ model: model.apiModel ?? "yolo26x-cls" }}
                onResult={(result, sourceUrl) => handleResult(result, fileRef.current ?? sourceUrl ?? imageUrl)}
                onRandomClassChange={setRandomClass}
                randomClassMatched={randomClass
                    ? latestResult.some((prediction) => (
                        String(prediction.class_name ?? prediction.class ?? "")
                            .toLowerCase()
                            .replace(/[_-]+/g, " ")
                            .trim() === randomClass.toLowerCase().replace(/[_-]+/g, " ").trim()
                    ))
                    : undefined}
                randomImageLabel={t("ui.randomImage")}
                randomImageLoadingLabel={t("ui.loadingRandomImage")}
                randomClassLabel={t("ui.randomClass")}
                onRandomImage={async () => {
                    if (!model.testImages) return getRandomImageUrl(model);
                    const selection = selectRandomTestImage(
                        model.testImages,
                        undefined,
                        model.testImageDirectory
                    );
                    if (!selection) throw new Error("No test images are available.");
                    return {
                        url: new URL(selection.url, window.location.origin).href,
                        query: selection.className,
                    };
                }}
                onPredictionStart={onPredictionStart}
            />
        </div>
    );
};
