import { useEffect, useRef, useState } from "react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";
import { getRandomImageUrl } from "../../../services/mediaService.js";
import { ImageInputPanel } from "../../../components/ui/ImageInputPanel.jsx";
import { sendFileToAPI } from "../../../utils/fileApi.js";

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
    const endpoint = `${API_URL}/api/${model.apiPath}/${model.endpoints.image}`;
    const handleResult = (nextResult, sourceUrl) => {
        const predictions = Array.isArray(nextResult) ? nextResult : nextResult?.predictions ?? [];
        setLatestResult(predictions);
        onChange(nextResult, sourceUrl);
    };

    useEffect(() => {
        const rerunPrediction = async (confidenceThreshold) => {
            const params = new URLSearchParams({ conf: String(confidenceThreshold) });
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
                }).toString()}`);
                const result = await response.json();
                if (!response.ok) throw new Error(result?.detail ?? "Classification prediction failed.");
                handleResult(result, imageUrl);
            }
        };

        onPredictionControlsReady?.(rerunPrediction);
        return () => onPredictionControlsReady?.(null);
    }, [endpoint, imageUrl, model.fileFieldName, onChange, onPredictionControlsReady, onPredictionPending]);

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
                onRandomImage={() => getRandomImageUrl(model)}
                onPredictionStart={onPredictionStart}
            />
        </div>
    );
};
