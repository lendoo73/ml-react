import { useCallback, useRef, useState } from "react";

export const useDetectionWorkspace = () => {
    const [activeSourceId, setActiveSourceId] = useState("image");
    const [result, setResult] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [isResultPending, setIsResultPending] = useState(false);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [videoResponse, setVideoResponse] = useState(null);
    const rerunPredictionRef = useRef(null);

    const onResultChange = useCallback((nextResult, nextImage = null) => {
        setResult(nextResult);
        setPreviewImage(nextImage);
        setIsResultPending(false);
    }, []);
    const onPredictionStart = useCallback(() => {
        setResult(null);
        setPreviewImage(null);
        setVideoResponse(null);
        setIsResultPending(true);
    }, []);
    const onPredictionPending = useCallback(() => setIsResultPending(true), []);
    const onSourceChange = useCallback((nextSourceId) => {
        setActiveSourceId(nextSourceId);
        setResult(null);
        setPreviewImage(null);
        setVideoResponse(null);
        setIsResultPending(false);
        setConfidenceThreshold(0.5);
        rerunPredictionRef.current = null;
    }, []);
    const onPredictionControlsReady = useCallback((rerunPrediction) => {
        rerunPredictionRef.current = rerunPrediction;
    }, []);
    const onConfidenceThresholdChange = useCallback((threshold) => {
        setConfidenceThreshold(threshold);
        void rerunPredictionRef.current?.(threshold);
    }, []);

    return {
        activeSourceId,
        confidenceThreshold,
        isResultPending,
        onConfidenceThresholdChange,
        onPredictionControlsReady,
        onPredictionPending,
        onPredictionStart,
        onResultChange,
        onSourceChange,
        previewImage,
        result,
        setVideoResponse,
        videoResponse,
    };
};
