import { API_URL } from "../config/settings.js";

export const getRandomVideoUrl = async (model) => {
    return getRandomMediaUrl(model, "videos");
};

export const getRandomImageUrl = async (model) => {
    return getRandomMediaUrl(model, "images");
};

const getRandomMediaUrl = async (model, mediaType) => {
    let availableClasses = Array.isArray(model?.classes) ? model.classes.filter(Boolean) : [];
    if (availableClasses.length === 0 && Array.isArray(model?.previewKeywords)) {
        availableClasses = model.previewKeywords.filter(Boolean);
    }
    if (availableClasses.length === 0 && model?.classSourceUrl) {
        const classResponse = await fetch(model.classSourceUrl);
        if (!classResponse.ok) {
            throw new Error(`Class list request failed with status ${classResponse.status}.`);
        }
        availableClasses = (await classResponse.text()).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    }
    if (availableClasses.length === 0) {
        throw new Error(`No ${mediaType.slice(0, -1)} search terms are configured for this model.`);
    }

    const className = availableClasses[Math.floor(Math.random() * availableClasses.length)];
    const query = model.classSearchQueries?.[className] ?? className;
    const params = new URLSearchParams({
        query,
        per_page: "1",
        random: "true",
    });
    const response = await fetch(`${API_URL}/api/media/${mediaType}/search?${params.toString()}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.detail || `Media search failed with status ${response.status}.`);
    }

    const mediaUrl = data.items?.[0]?.source_url;
    if (!mediaUrl) {
        throw new Error(`No ${mediaType.slice(0, -1)} was found for the class "${query}".`);
    }

    return { url: mediaUrl, query: className };
};
