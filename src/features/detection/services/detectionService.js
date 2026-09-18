import { API_URL } from "../../../config/settings.js";

export const fetchDetectionClassPreview = async (model, className) => {
    const params = new URLSearchParams({ query: className, output: "image" });
    const response = await fetch(`${API_URL}/api/${model.apiPath}/${model.endpoints.search}?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`Detection preview failed with status ${response.status}`);
    }

    return response.blob();
};
