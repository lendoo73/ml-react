import { useCallback, useState } from "react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";
import { selectRandomTestImage } from "../utils/selectRandomTestImage.js";

export const useRandomClassImage = (model, onPreview) => {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const onSelectClass = useCallback(async (className) => {
        setIsLoading(true);
        setError("");

        try {
            if (model.testImageDirectory && model.testImages) {
                const selection = selectRandomTestImage(model.testImages, className, model.testImageDirectory);
                if (!selection) throw new Error(`No test image found for class "${className}".`);
                const { url: sourceUrl } = selection;

                const imageResponse = await fetch(sourceUrl);
                if (!imageResponse.ok) throw new Error(`Unable to load test image (${imageResponse.status}).`);
                const imageBlob = await imageResponse.blob();
                const imageFile = new File([imageBlob], sourceUrl.split("/").pop(), { type: imageBlob.type });
                const formData = new FormData();
                formData.append(model.fileFieldName ?? "source", imageFile);
                const params = new URLSearchParams({
                    output: "image",
                    conf: "0.5",
                    model: model.apiModel ?? "yolo26x-cls",
                });
                const response = await fetch(`${API_URL}/api/${model.apiPath ?? "classification"}/predict?${params}`, {
                    method: "POST",
                    body: formData,
                });
                if (!response.ok) throw new Error(`Image prediction failed with status ${response.status}.`);

                onPreview(URL.createObjectURL(await response.blob()), className, sourceUrl);
                return;
            }

            const params = new URLSearchParams({
                output: "image",
                conf: "0.5",
                model: model.apiModel ?? "yolo26x-cls",
            });
            const mediaParams = new URLSearchParams({
                query: model.classSearchQueries?.[className] ?? className,
                per_page: "1",
                random: "true",
            });
            const mediaResponse = await fetch(`${API_URL}/api/media/images/search?${mediaParams.toString()}`);
            const mediaResult = await mediaResponse.json().catch(() => ({}));
            const sourceUrl = mediaResult.items?.[0]?.source_url;
            if (!mediaResponse.ok || !sourceUrl) {
                throw new Error(mediaResult.detail || `No image found for class "${className}".`);
            }
            params.set(model.queryParamName ?? "source", sourceUrl);
            const response = await fetch(
                `${API_URL}/api/${model.apiPath ?? "classification"}/predict?${params.toString()}`
            );
            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.detail || `Weather image prediction failed with status ${response.status}.`);
            }

            onPreview(URL.createObjectURL(await response.blob()), className, sourceUrl);
        } catch (previewError) {
            console.error("Unable to load a random weather classification preview:", previewError);
            setError(t("ui.classificationSearchError"));
        } finally {
            setIsLoading(false);
        }
    }, [model, onPreview, t]);

    return { error, isLoading, onSelectClass };
};
