import { ImageInputPanel } from "../../../components/ui/ImageInputPanel.jsx";
import { ImagePredictionResult } from "../../../components/ui/ImagePredictionResult.jsx";
import { useLanguage } from "../../../context/useLanguage.js";
import { useMemo, useState } from "react";
import { API_URL } from "../../../config/settings.js";
import { getRandomImageUrl } from "../../../services/mediaService.js";

const VALIDATION_URL = "https://github.com/lendoo73/passenger-counter/tree/main/datasets/valid/images";

export const PredictImage = ({ model, onChange, onPredictionStart, initialMode = "image" }) => {
    const [result, setResult] = useState(null);
    const [file, setFile] = useState(null);
    const [imgUrl, setImgUrl] = useState("");
    const [inputMode, setInputMode] = useState(initialMode);

    const { t } = useLanguage();
    const endpointBase = model?.apiPath ? `${API_URL}/api/${model.apiPath}` : "";
    const fileEndpoint = model?.endpoints?.image ? `${endpointBase}/${model.endpoints.image}` : "";
    const urlEndpoint = model?.endpoints?.url ? `${endpointBase}/${model.endpoints.url}` : "";
    const detectionCount = useMemo(() => {
        if (model?.resultType === "classification") {
            if (Array.isArray(result)) return result.length;
            if (Array.isArray(result?.predictions)) return result.predictions.length;
            return 0;
        }

        return Array.isArray(result) ? result.length : 0;
    }, [model?.resultType, result]);
    const hasTrainingInfo = Boolean(model?.trainingInfo);

    const handleFileSelect = (f) => {
        setInputMode("image");
        setImgUrl("");
        setResult(null);
        setFile(f);
    };

    const handleFileResult = (r) => {
        setResult(r);
        onChange?.(r, file);
    };

    const handleUrlResult = (r, sourceUrl) => {
        setInputMode("url");
        setFile(null);
        setResult(r);
        onChange?.(r, sourceUrl ?? imgUrl);
    };

    return (
        <>
            {hasTrainingInfo ? (
                <div
                        className="
                        w-full max-w-2xl
                        border border-blue-200 dark:border-blue-800
                        bg-blue-50/60 dark:bg-blue-950/50
                        rounded-lg p-4
                        "
                    role="note"
                    aria-label={model.trainingInfo.title}
                >
                    <div className="flex items-start gap-3">
                        <div
                            className="
                                mt-1 h-6 w-6 flex items-center justify-center
                                rounded-full bg-blue-100 text-blue-800
                                dark:bg-blue-900 dark:text-blue-200
                                font-bold
                            "
                            aria-hidden="true"
                            title="Info"
                        ></div>
                        <div className="text-sm leading-6">
                            <p className="font-semibold mb-1">{model.trainingInfo.title}</p>
                            <p className="text-gray-700 dark:text-gray-300">{model.trainingInfo.body}</p>
                            <p className="mt-3">
                                <a
                                    href={VALIDATION_URL}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="
                                        inline-flex items-center gap-2
                                        text-blue-600 dark:text-blue-300
                                        underline hover:no-underline
                                    "
                                    aria-label={model.trainingInfo.validationLinkAria}
                                >
                                    <span>📦</span>
                                    <span>{model.trainingInfo.validationLink}</span>
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

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
                onResult={(result, sourceUrl) => (
                    inputMode === "image" ? handleFileResult(result) : handleUrlResult(result, sourceUrl)
                )}
                randomImageLabel={t("ui.randomImage")}
                randomImageLoadingLabel={t("ui.loadingRandomImage")}
                randomClassLabel={t("ui.randomClass")}
                onRandomImage={() => getRandomImageUrl(model)}
                onPredictionStart={onPredictionStart}
            />
            {result && model?.resultType !== "classification" ? (
                <ImagePredictionResult
                    image={file ?? imgUrl}
                    result={result}
                    countLabel={model?.predictionLabel}
                    count={detectionCount}
                    boxes={result}
                    showLabel={t("image.showBoxes")}
                    hideLabel={t("image.hideBoxes")}
                    alt={t("image.uploaded")}
                    responseLabel={t("ui.apiResponse")}
                    imageWidth="max-w-none lg:w-[calc(100%-17rem)]"
                />
            ) : null}
        </>
    );
};