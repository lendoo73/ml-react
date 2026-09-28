import { useCallback } from "react";
import { API_URL } from "../../../config/settings.js";

export const useSegmentationClassPreview = () => useCallback(async (model, className) => {
    const mediaSearchParams = new URLSearchParams({
        query: className,
        per_page: "1",
        random: "true",
    });
    const mediaResponse = await fetch(`${API_URL}/api/media/images/search?${mediaSearchParams.toString()}`);
    if (!mediaResponse.ok) {
        throw new Error(`Pexels search failed with status ${mediaResponse.status}`);
    }

    const mediaResult = await mediaResponse.json();
    const sourceUrl = mediaResult?.items?.[0]?.source_url;
    if (!sourceUrl) throw new Error(`No Pexels image found for ${className}`);

    const params = new URLSearchParams({
        source: sourceUrl,
        output: "image",
        conf: "0.5",
        color_mode: "instance",
    });
    const response = await fetch(`${API_URL}/api/${model.apiPath}/${model.endpoints.image}?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`Segmentation preview failed with status ${response.status}`);
    }

    return response.blob();
}, []);
