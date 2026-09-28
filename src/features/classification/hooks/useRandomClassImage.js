import { useCallback, useState } from "react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";

export const useRandomClassImage = (model, onPreview) => {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const onSelectClass = useCallback(async (className) => {
        setIsLoading(true);
        setError("");

        try {
            const params = new URLSearchParams({
                query: model.classSearchQueries?.[className] ?? className,
                output: "image",
                conf: "0.5",
            });
            const response = await fetch(
                `${API_URL}/api/${model.apiPath}/${model.endpoints.search}?${params.toString()}`
            );
            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.detail || `Weather image prediction failed with status ${response.status}.`);
            }

            onPreview(URL.createObjectURL(await response.blob()), className);
        } catch (previewError) {
            console.error("Unable to load a random weather classification preview:", previewError);
            setError(t("ui.classificationSearchError"));
        } finally {
            setIsLoading(false);
        }
    }, [model, onPreview, t]);

    return { error, isLoading, onSelectClass };
};
