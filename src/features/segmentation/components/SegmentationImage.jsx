import { useRef, useState } from "react";
import { ImageInputPanel } from "../../../components/ui/ImageInputPanel.jsx";
import { ImagePredictionResult } from "../../../components/ui/ImagePredictionResult.jsx";
import { useLanguage } from "../../../context/useLanguage.js";
import { API_URL } from "../../../config/settings.js";
import { getRandomImageUrl } from "../../../services/mediaService.js";

export const SegmentationImage = ({ model, onChange, onPredictionStart }) => {
    const { t } = useLanguage();
    const [result, setResult] = useState(null);
    const [file, setFile] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
    const sourceRef = useRef(null);
    const endpoint = `${API_URL}/api/${model.apiPath}/${model.endpoints.image}`;
    const segmentations = Array.isArray(result) ? result : [];

    const handleResult = (nextResult, source, sourceType) => {
        setResult(nextResult);
        onChange?.(nextResult, source);
        if (sourceType === "file") setImageUrl("");
        if (sourceType === "url") setFile(null);
    };

    return (
        <>
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
                onPredictionStart={onPredictionStart}
            />
            {result ? (
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
                    imageWidth="max-w-none lg:w-[calc(100%-17rem)]"
                />
            ) : null}
        </>
    );
};
