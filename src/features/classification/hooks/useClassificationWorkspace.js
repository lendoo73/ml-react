import { useCallback, useEffect, useRef, useState } from "react";

const getInitialSourceId = (model) => model?.supportedInputs?.[0] ?? "image";

export const useClassificationWorkspace = (model) => {
    const [activeSourceId, setActiveSourceId] = useState(getInitialSourceId(model));
    const [result, setResult] = useState(null);
    const [isResultPending, setIsResultPending] = useState(false);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [previewImage, setPreviewImage] = useState(null);
    const [randomPreview, setRandomPreview] = useState(null);
    const [videoResponse, setVideoResponse] = useState(null);
    const rerunPredictionRef = useRef(null);
    const resultRef = useRef(null);

    useEffect(() => () => {
        if (previewImage?.startsWith?.("blob:")) URL.revokeObjectURL(previewImage);
    }, [previewImage]);

    useEffect(() => () => {
        if (randomPreview?.url) URL.revokeObjectURL(randomPreview.url);
    }, [randomPreview]);

    const onResultChange = useCallback((nextResult, nextPreviewImage = null) => {
        setResult(nextResult);
        setIsResultPending(false);
        setPreviewImage((currentImage) => {
            if (currentImage?.startsWith?.("blob:")) URL.revokeObjectURL(currentImage);
            return nextPreviewImage instanceof Blob
                ? URL.createObjectURL(nextPreviewImage)
                : nextPreviewImage;
        });
    }, []);

    const onPredictionStart = useCallback(() => {
        setConfidenceThreshold(0.5);
        setResult(null);
        setVideoResponse(null);
        setIsResultPending(true);
        setPreviewImage((currentImage) => {
            if (currentImage?.startsWith?.("blob:")) URL.revokeObjectURL(currentImage);
            return null;
        });
    }, []);

    const onPredictionPending = useCallback(() => setIsResultPending(true), []);
    const onPredictionControlsReady = useCallback((rerunPrediction) => {
        rerunPredictionRef.current = rerunPrediction;
    }, []);
    const onImageLoad = useCallback(() => {
        const element = resultRef.current;
        if (!element) return;
        const top = element.getBoundingClientRect().top + window.scrollY - 24;
        window.scrollTo({ top, behavior: "smooth" });
    }, []);
    const onConfidenceThresholdChange = useCallback((nextThreshold) => {
        setConfidenceThreshold(nextThreshold);
        void rerunPredictionRef.current?.(nextThreshold);
    }, []);
    const onSourceChange = useCallback((nextSourceId) => {
        setActiveSourceId(nextSourceId);
        setResult(null);
        setVideoResponse(null);
        setIsResultPending(false);
        setConfidenceThreshold(0.5);
        setPreviewImage(null);
        rerunPredictionRef.current = null;
    }, []);
    const onVideoResponseChange = useCallback((nextResponse) => {
        setVideoResponse(nextResponse);
    }, []);
    const onRandomPreview = useCallback((url, className, sourceUrl) => {
        setRandomPreview(url ? { url, className, sourceUrl } : null);
    }, []);

    return {
        activeSourceId,
        confidenceThreshold,
        isResultPending,
        onConfidenceThresholdChange,
        onImageLoad,
        onPredictionControlsReady,
        onPredictionPending,
        onPredictionStart,
        onRandomPreview,
        onResultChange,
        onSourceChange,
        onVideoResponseChange,
        previewImage,
        randomPreview,
        result,
        resultRef,
        videoResponse,
    };
};
