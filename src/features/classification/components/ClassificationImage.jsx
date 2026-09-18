import { useRef, useState } from "react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";
import { getRandomImageUrl } from "../../../services/mediaService.js";
import { ImageInputPanel } from "../../../components/ui/ImageInputPanel.jsx";

export const ClassificationImage = ({ model, onChange, onPredictionStart }) => {
    const [file, setFile] = useState(null);
    const fileRef = useRef(null);
    const [imageUrl, setImageUrl] = useState("");
    const { t } = useLanguage();
    const endpoint = `${API_URL}/api/${model.apiPath}/${model.endpoints.image}`;

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
                onResult={(result, sourceUrl) => onChange(result, fileRef.current ?? sourceUrl ?? imageUrl)}
                randomImageLabel={t("ui.randomImage")}
                randomImageLoadingLabel={t("ui.loadingRandomImage")}
                randomClassLabel={t("ui.randomClass")}
                onRandomImage={() => getRandomImageUrl(model)}
                onPredictionStart={onPredictionStart}
            />
        </div>
    );
};
