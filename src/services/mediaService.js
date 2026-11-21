import { API_URL } from "../config/settings.js";

export const getRandomVideoUrl = async (model, searchTerms) => {
    return getRandomMediaUrl(model, "videos", searchTerms);
};

export const getRandomImageUrl = async (model, searchTerms) => {
    return getRandomMediaUrl(model, "images", searchTerms);
};

const getRandomMediaUrl = async (model, mediaType, searchTerms) => {
    let availableClasses = Array.isArray(searchTerms)
        ? searchTerms.filter(Boolean)
        : Array.isArray(model?.classes) ? model.classes.filter(Boolean) : [];
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

    const firstClassIndex = Math.floor(Math.random() * availableClasses.length);
    const searchClasses = [
        availableClasses[firstClassIndex],
        ...availableClasses.filter((_, index) => index !== firstClassIndex),
    ].slice(0, 5);
    let lastQuery = searchClasses[0];

    for (const className of searchClasses) {
        const configuredQueries = model.classSearchQueries?.[className];
        const queryOptions = Array.isArray(configuredQueries) ? configuredQueries.filter(Boolean) : null;
        const query = queryOptions
            ? queryOptions[Math.floor(Math.random() * queryOptions.length)] ?? className
            : configuredQueries ?? className;
        lastQuery = query;
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
        if (mediaUrl) return { url: mediaUrl, query: className };
    }

    throw new Error(`No ${mediaType.slice(0, -1)} was found for the class "${lastQuery}".`);
};
