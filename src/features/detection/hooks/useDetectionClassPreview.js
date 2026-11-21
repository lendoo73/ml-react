import { useCallback } from "react";
import { API_URL } from "../../../config/settings.js";

export const useDetectionClassPreview = () => useCallback(async (model, className, output = "image") => {
    const localImages = model.previewImagesByClass?.[className];
    if (localImages?.length) {
        const imagePath = localImages[Math.floor(Math.random() * localImages.length)];
        const sourceUrl = new URL(imagePath, window.location.origin).href;
        const imageResponse = await fetch(sourceUrl);
        if (!imageResponse.ok) {
            throw new Error(`Unable to load the local preview image (status ${imageResponse.status}).`);
        }

        const formData = new FormData();
        const imageName = sourceUrl.split("/").pop();
        const imageBlob = await imageResponse.blob();
        formData.append("source", imageBlob, imageName);
        const params = new URLSearchParams({ output, model: model.apiModel ?? "yolo26x" });
        const response = await fetch(`${API_URL}/api/${model.apiPath ?? "object_detection"}/predict?${params}`, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            const errorMessage = response.headers.get("content-type")?.includes("application/json")
                ? (await response.json()).detail
                : await response.text();
            throw new Error(errorMessage || `Detection preview failed with status ${response.status}`);
        }

        if (output === "json") {
            return {
                result: await response.json(),
                url: sourceUrl,
                query: className,
            };
        }

        return { blob: await response.blob(), sourceUrl, query: className };
    }

    const classSearchQuery = model.classSearchQueries?.[className] ?? className;
    const mediaParams = new URLSearchParams({
        query: classSearchQuery,
        per_page: "1",
        random: "true",
    });
    const mediaResponse = await fetch(`${API_URL}/api/media/images/search?${mediaParams.toString()}`);
    const mediaResult = await mediaResponse.json().catch(() => ({}));
    const sourceUrl = mediaResult.items?.[0]?.source_url;
    if (!mediaResponse.ok || !sourceUrl) {
        throw new Error(mediaResult.detail || `No image found for class "${className}".`);
    }

    const predictionParams = new URLSearchParams({
        source: sourceUrl,
        output,
        model: model.apiModel ?? "yolo26x",
    });
    const apiPath = model.apiPath ?? "object_detection";
    const response = await fetch(
        `${API_URL}/api/${apiPath}/predict?${predictionParams.toString()}`
    );
    if (!response.ok) {
        throw new Error(`Detection preview failed with status ${response.status}`);
    }


    if (output === "json") return { result: await response.json(), url: sourceUrl, query: className };

    return { blob: await response.blob(), sourceUrl, query: className };
}, []);
