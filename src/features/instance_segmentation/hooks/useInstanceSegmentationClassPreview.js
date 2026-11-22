import { useCallback } from "react";
import { API_URL } from "../../../config/settings.js";
import brainTumorTestImages from "../brainTumorTestImages.json";

const predictFromTestImage = async (model, className, { output = "image" } = {}, testImages = brainTumorTestImages) => {
    const classCode = model.testImageClassCodes?.[className];
    const candidates = classCode ? testImages.filter((filename) => filename.includes(`_${classCode}_`)) : testImages;
    if (candidates.length === 0) throw new Error(`No test images found${className ? ` for ${className}` : ""}`);

    const filename = candidates[Math.floor(Math.random() * candidates.length)];
    const selectedClass = model.classes?.find((name) => (
        model.testImageClassCodes?.[name] && filename.includes(`_${model.testImageClassCodes[name]}_`)
    ));
    if (output === "json" && model.testImageClassCodes && !selectedClass) {
        throw new Error(`Unable to determine the tumor class from ${filename}`);
    }
    const sourceUrl = `${model.testImageDirectory}/${filename}`;
    const imageResponse = await fetch(sourceUrl);
    if (!imageResponse.ok) throw new Error(`Unable to load test image (${imageResponse.status})`);

    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], filename, { type: imageBlob.type || "image/jpeg" });
    const formData = new FormData();
    formData.append("source", imageFile);
    const apiPath = model.apiPath ?? "instance_segmentation";
    const params = new URLSearchParams({ output, model: model.apiModel ?? "yolo26x-seg" });
    const endpoint = `${API_URL}/api/${apiPath}/predict?${params}`;
    const response = await fetch(endpoint, { method: "POST", body: formData });
    if (!response.ok) throw new Error(`Instance-segmentation prediction failed with status ${response.status}`);

    return output === "json"
        ? { result: await response.json(), url: sourceUrl, file: imageFile, query: selectedClass }
        : { blob: await response.blob(), sourceUrl };
};

export const useInstanceSegmentationClassPreview = () => useCallback(async (model, className, options) => {
    if (model.testImageDirectory && (model.testImageManifest || model.testImageClassCodes?.[className] || options?.output === "json")) {
        const testImages = model.testImageManifest
            ? await fetch(model.testImageManifest).then((response) => {
                if (!response.ok) throw new Error(`Unable to load test image list (${response.status})`);
                return response.json();
            })
            : brainTumorTestImages;
        return predictFromTestImage(model, className, options, testImages);
    }

    const mediaSearchParams = new URLSearchParams({
        query: model.classSearchQueries?.[className] ?? className,
        per_page: "1",
        random: "true",
    });
    const mediaResponse = await fetch(`${API_URL}/api/media/images/search?${mediaSearchParams.toString()}`);
    const mediaResult = await mediaResponse.json().catch(() => ({}));
    if (!mediaResponse.ok) {
        throw new Error(mediaResult.detail ?? `Pexels search failed with status ${mediaResponse.status}`);
    }

    const sourceUrl = mediaResult?.items?.[0]?.source_url;
    if (!sourceUrl) throw new Error(`No Pexels image found for ${className}`);

    const params = new URLSearchParams({
        source: sourceUrl,
        output: "image",
        conf: "0.5",
        color_mode: "instance",
        model: model.apiModel ?? "yolo26x-seg",
    });
    const apiPath = `${model.apiPath ?? "instance_segmentation"}/predict`;
    const response = await fetch(`${API_URL}/api/${apiPath}?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`Instance-segmentation preview failed with status ${response.status}`);
    }

    return { blob: await response.blob(), sourceUrl };
}, []);
