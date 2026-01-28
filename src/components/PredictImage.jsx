import {SubHeader} from "./SubHeader.jsx";
import {FileUploader} from "./ui/FileUploader.jsx";
import {UrlInput} from "./ui/UrlInput.jsx";
import {ImageWithBoxes} from "./ui/ImageWithBoxes.jsx";
import {useLanguage} from "../context/useLanguage.js";
import {useMemo, useState} from "react";
import {API_URL} from "../config/settings.js";

const responseStyle = `
    px-6 py-3 rounded-lg text-lg font-semibold text-center
    bg-blue-100 text-blue-800
    dark:bg-blue-900 dark:text-blue-200
`;
const VALIDATION_URL = "https://github.com/lendoo73/passenger-counter/tree/main/datasets/valid/images";

export const PredictImage = ({ onChange }) => {
    const [result, setResult] = useState(null);
    const [file, setFile] = useState(null);
    const [imgUrl, setImgUrl] = useState("");

    const detectionCount = useMemo(() => (Array.isArray(result) ? result.length : 0), [result]);

    const { t } = useLanguage();


    const handleFileSelect = (f) => {
        setImgUrl("");
        setResult(null);
        setFile(f);
    };

    const handleFileResult = (r) => {
        setResult(r);
        onChange?.(r);
    };

    const handleUrlResult = (r) => {
        setFile(null);
        setResult(r);
        onChange?.(r);
    };

    return (
        <>
            <SubHeader content={t("models.0.mode.image.subheader")}/>

            <FileUploader
                label={t("models.0.mode.image.uploadLabel")}
                buttonText={t("models.0.mode.image.chooseFile")}
                accept="image/png,image/jpeg,image/webp"
                endpoint={`${API_URL}/api/passenger_counter/predict/image`}
                onResult={handleFileResult}
                onFileSelect={handleFileSelect}
            />
            <div
                className="
                    w-full max-w-2xl
                    border border-blue-200 dark:border-blue-800
                    bg-blue-50/60 dark:bg-blue-950/50
                    rounded-lg p-4
                "
                role="note"
                aria-label={t("models.0.trainingInfo.title")}
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
                        <p className="font-semibold mb-1">{t("models.0.trainingInfo.title")}</p>
                        <p className="text-gray-700 dark:text-gray-300">{t("models.0.trainingInfo.body")}</p>
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
                                aria-label={t("models.0.trainingInfo.validationLinkAria")}
                            >
                                <span>📦</span>
                                <span>{t("models.0.trainingInfo.validationLink")}</span>
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            <UrlInput
                label="Enter image URL"
                buttonText="Predict from URL"
                imgUrl={imgUrl}
                setImgUrl={(value) => {
                    setFile(null);
                    setResult(null);
                    setImgUrl(value);
                }}
                endpoint={`${API_URL}/api/passenger_counter/predict/url`}
                onResult={handleUrlResult}
            />
            {result && (
                <div className="pb-12">
                    <div className={responseStyle}>{t("models.0.passengerCount")}: {detectionCount}</div>

                    {(file || imgUrl) && (
                        <ImageWithBoxes
                            image={file ?? imgUrl}
                            boxes={result}
                            showLabel={t("image.showBoxes")}
                            hideLabel={t("image.hideBoxes")}
                            alt={t("image.uploaded")}
                        />
                    )}

                    <div
                        className="
                            mt-4 w-full max-w-lg rounded-lg overflow-hidden
                            border border-blue-200 dark:border-blue-800
                            bg-blue-50 dark:bg-blue-950
                        "
                    >
                        <div className={responseStyle}>{t("models.0.apiResponse")}</div>
                        <div
                            className="
                                p-4 max-h-64 overflow-y-auto
                                bg-white dark:bg-gray-800
                                text-sm
                            "
                        >
                            <pre className="whitespace-pre-wrap break-words">
                                {JSON.stringify(result, null, 4)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};