import { useCallback } from "react";
import { API_URL } from "../../../config/settings.js";

export const useClassificationClassPreview = () => useCallback(async (model, className) => {
    const mediaParams = new URLSearchParams({
        query: model.classSearchQueries?.[className] ?? className,
        per_page: "8",
        random: "true",
    });
    const mediaResponse = await fetch(`${API_URL}/api/media/images/search?${mediaParams.toString()}`);
    const mediaResult = await mediaResponse.json().catch(() => ({}));
    if (!mediaResponse.ok) {
        throw new Error(mediaResult.detail || `Media search failed with status ${mediaResponse.status}`);
    }

    const sourceUrls = (mediaResult.items ?? []).map((item) => item.source_url).filter(Boolean);
    if (sourceUrls.length === 0) {
        throw new Error(`No image found for class "${className}".`);
    }

    for (const sourceUrl of sourceUrls) {
        const params = new URLSearchParams({
            [model.queryParamName ?? "source"]: sourceUrl,
            output: "image",
        });
        const response = await fetch(`${API_URL}/api/${model.apiPath}/${model.endpoints.image}?${params.toString()}`);
        if (response.ok) return response.blob();
    }

    throw new Error(`Classification preview failed for class "${className}".`);
}, []);
