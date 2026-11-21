
import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play } from "lucide-react";
import { SubHeader } from "../../../components/SubHeader.jsx";
import { VideoUploader } from "../../../components/ui/VideoUploader.jsx";
import { UrlInput } from "../../../components/ui/UrlInput.jsx";
import { useLanguage } from "../../../context/useLanguage.js";
import { API_URL } from "../../../config/settings.js";
import { FixedSpinner } from "../../../components/ui/FixedSpinner.jsx";
import { ClassSelector } from "../../../components/ui/ClassSelector.jsx";
import { getRandomVideoUrl } from "../../../services/mediaService.js";
import { VideoApiResponseCard } from "../../../components/ui/VideoApiResponseCard.jsx";
import { Checkbox } from "../../../components/ui/Checkbox.jsx";
import { ConfidenceThresholdControl } from "../../../components/ui/ConfidenceThresholdControl.jsx";
import { AnnotationSizeControl } from "../../../components/ui/AnnotationSizeControl.jsx";
import { PredictionResultLayout } from "../../../components/ui/PredictionResultLayout.jsx";
import { FullscreenMediaLayout } from "../../../components/ui/FullscreenMediaLayout.jsx";
import { TrackingControls } from "../../../components/ui/TrackingControls.jsx";
import { drawAnnotationLabel } from "../../../components/ui/drawAnnotationLabel.js";
import { getAnnotationColor } from "../../../utils/getAnnotationColor.js";
import { getOrientedBoxLabelGeometry } from "../../obb/utils/getOrientedBoxLabelGeometry.js";
import { waitForVideoJob } from "../../../services/videoJobService.js";
import { appendQueryParams } from "../../../utils/appendQueryParams.js";

const makeTimestampIndex = (frames) => {
    if (!Array.isArray(frames)) return () => null;
    const hasTimestamps = frames.some((frame) => frame?.timestamp_ms != null);
    const timestamps = frames.map((frame, index) => frame?.timestamp_ms ?? frame?.frame_index ?? index);
    return (ms, duration) => {
        if (timestamps.length === 0) return null;
        if (!hasTimestamps) {
            const targetIndex = duration > 0
                ? Math.round((ms / 1000 / duration) * (frames.length - 1))
                : 0;
            return frames[Math.min(Math.max(targetIndex, 0), frames.length - 1)] ?? null;
        }

        let low = 0;
        let high = timestamps.length - 1;
        while (low < high) {
            const middle = Math.floor((low + high) / 2);
            if (timestamps[middle] < ms) low = middle + 1;
            else high = middle;
        }
        const previous = Math.max(0, low - 1);
        const closest = Math.abs(timestamps[low] - ms) < Math.abs(timestamps[previous] - ms)
            ? low
            : previous;
        return frames[closest] ?? null;
    };
};

const getPredictionClasses = (frames) => [...new Set(
    (Array.isArray(frames) ? frames : [])
        .flatMap((frame) => frame?.detections ?? frame?.segmentations ?? [])
        .map((item) => item.class_name)
        .filter(Boolean)
)];

const getDetectionCenter = (detection) => {
    if (detection?.bbox) {
        const { x_min, y_min, x_max, y_max } = detection.bbox;
        if ([x_min, y_min, x_max, y_max].every(Number.isFinite)) {
            return [(x_min + x_max) / 2, (y_min + y_max) / 2];
        }
    }
    const corners = detection?.obb?.corners;
    if (Array.isArray(corners) && corners.length) {
        return [
            corners.reduce((sum, [x]) => sum + x, 0) / corners.length,
            corners.reduce((sum, [, y]) => sum + y, 0) / corners.length,
        ];
    }
    const polygon = detection?.polygon;
    if (Array.isArray(polygon) && polygon.length) {
        return [
            polygon.reduce((sum, [x]) => sum + x, 0) / polygon.length,
            polygon.reduce((sum, [, y]) => sum + y, 0) / polygon.length,
        ];
    }
    return null;
};

export const PredictVideo = ({ model, supportsTracking = true, showHeader = true, showApiResponse = true, onResponseChange, onTrackingChange, randomVideoSearchTerms, randomVideoLabel, randomVideoHint, transformResult, drawCustomOverlay, renderSplitterOverlay, renderControlsPanel, onSplitterPointerMove, onSplitterPointerUp, onSplitterPointerCancel, defaultShowLabels = true, defaultShowConfidence = true }) => {
    const { t } = useLanguage();
    const isSegmentation = model.resultType === "segmentation" || model.id === "segmentation-placeholder";
    const isOrientedBoundingBox = model.supportsOrientedBoxes ?? model.id === "yolo26-obb-official";
    const endpointBase = `${API_URL}/api/${model.apiPath ?? (isSegmentation ? "segmentation" : "object_detection")}`;
    const videoEndpoint = `${endpointBase}/predict/video`;
    const videoUrlEndpoint = videoEndpoint;
    const videoFieldName = "source";

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const splitterOverlayRef = useRef(null);
    const selectedFrameIndexRef = useRef(0);
    const onResponseChangeRef = useRef(onResponseChange);
    onResponseChangeRef.current = onResponseChange;

    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [videoSourceUrl, setVideoSourceUrl] = useState("");
    const [predictions, setPredictions] = useState(null);
    const [rawPredictions, setRawPredictions] = useState(null);
    const [currentFrame, setCurrentFrame] = useState(null);
    const [splitterOverlayStyle, setSplitterOverlayStyle] = useState({ display: "none" });
    const [isPredicting, setIsPredicting] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [playbackError, setPlaybackError] = useState("");
    const [syncEnabled, setSyncEnabled] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [showBoxes, setShowBoxes] = useState(true);
    const [showBoundaryBoxes, setShowBoundaryBoxes] = useState(!isSegmentation);
    const [showOrientedBoxes, setShowOrientedBoxes] = useState(true);
    const [showLabels, setShowLabels] = useState(defaultShowLabels);
    const [showConfidence, setShowConfidence] = useState(defaultShowConfidence);
    const [tracking, setTracking] = useState(false);
    const [tracker, setTracker] = useState("bytetrack");
    const [showIds, setShowIds] = useState(true);
    const [showTrajectory, setShowTrajectory] = useState(false);
    const [annotationSession, setAnnotationSession] = useState(0);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [confidenceError, setConfidenceError] = useState("");
    const [annotationSize, setAnnotationSize] = useState(1);
    const videoContainerRef = useRef(null);
    const mediaContainerRef = useRef(null);

    const getFrameByTime = useMemo(() => makeTimestampIndex(predictions), [predictions]);

    const selectFrame = (frame, index, frames = predictions) => {
        selectedFrameIndexRef.current = index;
        setCurrentFrame(frame);
        const video = videoRef.current;
        if (!video || video.readyState < 1) return;
        video.currentTime = frame.timestamp_ms != null
            ? frame.timestamp_ms / 1000
            : (video.duration || 0) * (index / Math.max(frames.length - 1, 1));
    };

    const handleVideoChange = (file) => {
        setPredictions(null);
    setRawPredictions(null);
        setPlaybackError("");
        setVideoFile(file);
        setVideoSourceUrl("");
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        if (file) setVideoUrl(URL.createObjectURL(file));
        else setVideoUrl("");
    };

    const prepareFrames = (result, trackingEnabled = tracking) => {
        const frames = Array.isArray(result) ? result : null;
        if (frames && videoRef.current?.videoWidth && videoRef.current?.videoHeight) {
            return transformResult?.(frames, {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
            }, trackingEnabled) ?? frames;
        }
        return frames;
    };

    const handleVideoResult = (result, trackingEnabled = tracking) => {
        const frames = Array.isArray(result) ? result : null;
        const processedFrames = prepareFrames(result, trackingEnabled);
        selectedFrameIndexRef.current = 0;
        setRawPredictions(frames);
        setPredictions(processedFrames);
        setSelectedClasses(getPredictionClasses(processedFrames));
        setCurrentFrame(processedFrames?.[0] ?? null);
        onResponseChange?.(processedFrames ? {
            frames: processedFrames,
            currentFrame: processedFrames[0] ?? null,
            videoRef,
            onSelectFrame: (frame, index) => selectFrame(frame, index, processedFrames),
        } : null);
    };

    const handleVideoUrlResult = (result, sourceUrl, trackingEnabled = tracking) => {
        const frames = Array.isArray(result) ? result : null;
        const processedFrames = prepareFrames(result, trackingEnabled);
        selectedFrameIndexRef.current = 0;
        setRawPredictions(frames);
        setPredictions(processedFrames);
        setSelectedClasses(getPredictionClasses(processedFrames));
        setCurrentFrame(processedFrames?.[0] ?? null);
        onResponseChange?.(processedFrames ? {
            frames: processedFrames,
            currentFrame: processedFrames[0] ?? null,
            videoRef,
            onSelectFrame: (frame, index) => selectFrame(frame, index, processedFrames),
        } : null);
        setVideoFile(null);
        setPlaybackError("");
        setVideoSourceUrl(sourceUrl);
        if (videoUrl && videoUrl !== sourceUrl && videoFile) URL.revokeObjectURL(videoUrl);
        setVideoUrl(sourceUrl);
    };

    const toggleVideoPlayback = async () => {
        const video = videoRef.current;
        if (!video) return;

        try {
            if (video.paused) await video.play();
            else video.pause();
            setPlaybackError("");
        } catch (error) {
            console.error("Unable to control video playback:", error);
            setPlaybackError(t("ui.videoPlaybackError"));
        }
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return undefined;
        const syncPlaybackState = () => setIsVideoPlaying(!video.paused && !video.ended);
        video.addEventListener("play", syncPlaybackState);
        video.addEventListener("pause", syncPlaybackState);
        video.addEventListener("ended", syncPlaybackState);
        syncPlaybackState();
        return () => {
            video.removeEventListener("play", syncPlaybackState);
            video.removeEventListener("pause", syncPlaybackState);
            video.removeEventListener("ended", syncPlaybackState);
        };
    }, [videoUrl]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !Array.isArray(rawPredictions)) return undefined;
        const reprocessFrames = () => {
            if (!video.videoWidth || !video.videoHeight) return;
            const frames = transformResult?.(rawPredictions, {
                width: video.videoWidth,
                height: video.videoHeight,
            }, tracking) ?? rawPredictions;
            const selectedFrame = frames[Math.min(selectedFrameIndexRef.current, frames.length - 1)] ?? null;
            setPredictions(frames);
            setCurrentFrame(selectedFrame);
            onResponseChangeRef.current?.(frames.length ? {
                frames,
                currentFrame: selectedFrame,
                videoRef,
                onSelectFrame: (frame, index) => {
                    selectedFrameIndexRef.current = index;
                    setCurrentFrame(frame);
                    if (video.readyState >= 1) {
                        video.currentTime = frame.timestamp_ms != null
                            ? frame.timestamp_ms / 1000
                            : (video.duration || 0) * (index / Math.max(frames.length - 1, 1));
                    }
                },
            } : null);
        };
        video.addEventListener("loadedmetadata", reprocessFrames);
        reprocessFrames();
        return () => video.removeEventListener("loadedmetadata", reprocessFrames);
    }, [rawPredictions, tracking, transformResult, videoUrl]);

    const handleConfidenceThresholdChange = async (
        nextThreshold,
        trackingEnabled = tracking,
        selectedTracker = tracker,
    ) => {
        setConfidenceThreshold(nextThreshold);
        setConfidenceError("");
        if (!predictions?.length) return;

        const params = appendQueryParams(new URLSearchParams(), {
            ...model.queryParams,
            model: model.apiModel ?? (isSegmentation ? "yolo26x-seg" : "yolo26x"),
            conf: String(nextThreshold),
            ...(supportsTracking ? { tracking: String(trackingEnabled), tracker: selectedTracker } : {}),
        });
        const sourceUrl = videoSourceUrl || (!videoFile ? videoUrl : "");
        let response;

        if (!videoFile && !sourceUrl) {
            setConfidenceError(t("ui.videoConfidenceRequestFailed"));
            return;
        }

        setIsPredicting(true);
        setVideoProgress(0);
        try {
            if (videoFile) {
                const formData = new FormData();
                formData.append(videoFieldName, videoFile);
                response = await fetch(`${videoEndpoint}?${params}`, { method: "POST", body: formData });
            } else if (sourceUrl) {
                params.set("source", sourceUrl);
                response = await fetch(`${videoUrlEndpoint}?${params}`);
            }

            const responseText = await response.text();
            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch {
                data = { detail: responseText };
            }
            if (!response.ok) {
                setConfidenceError(data.detail ?? `Request failed with status ${response.status}`);
                return;
            }
            const nextResult = data.job_id
                ? await waitForVideoJob(videoEndpoint, data.job_id, setVideoProgress)
                : data;
            if (videoFile) handleVideoResult(nextResult, trackingEnabled);
            else handleVideoUrlResult(nextResult, sourceUrl, trackingEnabled);
        } catch (error) {
            setConfidenceError(error.message || t("ui.videoConfidenceRequestFailed"));
        } finally {
            setIsPredicting(false);
        }
    };

    const availableClasses = useMemo(() => (
        [...new Set(
            (predictions ?? [])
                .flatMap((frame) => frame?.detections ?? frame?.segmentations ?? [])
                .map((item) => item.class_name)
                .filter(Boolean)
        )]
    ), [predictions]);
    const classCounts = useMemo(() => (
        (currentFrame?.detections ?? currentFrame?.segmentations ?? [])
            .reduce((counts, item) => {
                if (item.class_name) counts[item.class_name] = (counts[item.class_name] ?? 0) + 1;
                return counts;
            }, {})
    ), [currentFrame]);

    useEffect(() => {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c) return;

        const syncSize = () => {
            const w = v.videoWidth || v.clientWidth;
            const h = v.videoHeight || v.clientHeight;
            if (w && h) {
                const videoAspect = w / h;
                const elementAspect = v.clientWidth / v.clientHeight;
                const renderedWidth = elementAspect > videoAspect
                    ? v.clientHeight * videoAspect
                    : v.clientWidth;
                const renderedHeight = elementAspect > videoAspect
                    ? v.clientHeight
                    : v.clientWidth / videoAspect;
                const videoRect = v.getBoundingClientRect();
                const containerRect = mediaContainerRef.current?.getBoundingClientRect();
                const pixelRatio = window.devicePixelRatio || 1;
                c.width = Math.round(renderedWidth * pixelRatio);
                c.height = Math.round(renderedHeight * pixelRatio);
                c.style.width = `${renderedWidth}px`;
                c.style.height = `${renderedHeight}px`;
                c.style.left = `${(videoRect.left - (containerRect?.left ?? videoRect.left)) + (videoRect.width - renderedWidth) / 2}px`;
                c.style.top = `${(videoRect.top - (containerRect?.top ?? videoRect.top)) + (videoRect.height - renderedHeight) / 2}px`;
                const overlayStyle = {
                    position: "absolute",
                    width: `${renderedWidth}px`,
                    height: `${renderedHeight}px`,
                    left: c.style.left,
                    top: c.style.top,
                };
                Object.assign(splitterOverlayRef.current?.style ?? {}, overlayStyle);
                setSplitterOverlayStyle(overlayStyle);
            }
        };

        v.addEventListener("loadedmetadata", syncSize);
        window.addEventListener("resize", syncSize);
        document.addEventListener("fullscreenchange", syncSize);
        const resizeObserver = new ResizeObserver(() => requestAnimationFrame(syncSize));
        resizeObserver.observe(v);
        if (mediaContainerRef.current) resizeObserver.observe(mediaContainerRef.current);
        syncSize();

        return () => {
            v.removeEventListener("loadedmetadata", syncSize);
            window.removeEventListener("resize", syncSize);
            document.removeEventListener("fullscreenchange", syncSize);
            resizeObserver.disconnect();
        };
    }, [videoUrl]);

    useEffect(() => {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c) return;
        const ctx = c.getContext("2d");

        let rafId;
        let videoFrameCallbackId;

        const draw = (mediaTime = v.currentTime) => {
            const scaleX = c.clientWidth / (v.videoWidth || c.width) || 1;
            const scaleY = c.clientHeight / (v.videoHeight || c.height) || 1;
            const pixelRatioX = c.width / (c.clientWidth || c.width);
            const pixelRatioY = c.height / (c.clientHeight || c.height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, c.width, c.height);
            ctx.setTransform(scaleX * pixelRatioX, 0, 0, scaleY * pixelRatioY, 0, 0);
            const displayScale = scaleX;
            const frameForOverlay = predictions && !isNaN(mediaTime)
                ? getFrameByTime(mediaTime * 1000, v.duration)
                : null;

            if (showBoxes && frameForOverlay) {
                const frame = frameForOverlay;
                const detections = (frame?.detections ?? [])
                    .filter((detection) => selectedClasses.includes(detection.class_name))
                    .filter((detection) => (detection.confidence ?? 0) >= confidenceThreshold);
                const segmentations = (frame?.segmentations ?? [])
                    .filter((segmentation) => selectedClasses.includes(segmentation.class_name))
                    .filter((segmentation) => (segmentation.confidence ?? 0) >= confidenceThreshold);

                if (tracking && showTrajectory && frame) {
                    const currentIndex = predictions.indexOf(frame);
                    const trails = new Map();
                    const activeTrackIds = new Set(
                        [...(frame.detections ?? []), ...(frame.segmentations ?? [])]
                            .filter((item) => item.track_id != null
                                && selectedClasses.includes(item.class_name)
                                && (item.confidence ?? 0) >= confidenceThreshold)
                            .map((item) => `${item.class_name}:${item.track_id}`)
                    );
                    predictions.slice(0, currentIndex + 1).forEach((pastFrame) => {
                        [...(pastFrame?.detections ?? []), ...(pastFrame?.segmentations ?? [])].forEach((item) => {
                            if (item.track_id == null || !selectedClasses.includes(item.class_name)
                                || (item.confidence ?? 0) < confidenceThreshold) return;
                            const center = getDetectionCenter(item);
                            if (!center) return;
                            const key = `${item.class_name}:${item.track_id}`;
                            if (!activeTrackIds.has(key)) return;
                            trails.set(key, [...(trails.get(key) ?? []), center]);
                        });
                    });
                    trails.forEach((points, key) => {
                        if (points.length < 2) return;
                        const [className, trackId] = key.split(":");
                        ctx.strokeStyle = getAnnotationColor(className, trackId, annotationSession).color;
                        ctx.lineWidth = Math.max(2, (3 * annotationSize) / displayScale);
                        ctx.beginPath();
                        points.slice(-50).forEach(([x, y], index) => index === 0
                            ? ctx.moveTo(x, y)
                            : ctx.lineTo(x, y));
                        ctx.stroke();
                    });
                }

                ctx.save();
                ctx.lineWidth = Math.max(1, (3 * annotationSize) / displayScale);
                ctx.font = `${(18 * annotationSize) / displayScale}px system-ui, sans-serif`;

                detections.forEach((det) => {
                    const corners = det.obb?.corners;
                    if (Array.isArray(corners) && corners.length >= 3) {
                        const labelGeometry = getOrientedBoxLabelGeometry(corners);
                        const labelFontSize = (18 * annotationSize) / displayScale;
                        ctx.strokeStyle = getAnnotationColor(det.class_name, det.track_id, annotationSession).color;
                        ctx.lineWidth = Math.max(1, (3 * annotationSize) / displayScale);
                        ctx.beginPath();
                        corners.forEach(([x, y], index) => index === 0
                            ? ctx.moveTo(x, y)
                            : ctx.lineTo(x, y));
                        ctx.closePath();
                        if (showOrientedBoxes) ctx.stroke();
                        drawAnnotationLabel(ctx, {
                            x: labelGeometry?.x ?? Math.min(...corners.map(([x]) => x)),
                            y: labelGeometry
                                ? Math.max(0, labelGeometry.y - labelFontSize * 1.35)
                                : Math.max(0, Math.min(...corners.map(([, y]) => y)) - (24 * annotationSize) / displayScale),
                            centered: Boolean(labelGeometry),
                            rotation: labelGeometry?.angle ?? 0,
                            className: showLabels ? det.class_name : "",
                            colorClassName: det.class_name,
                            trackId: det.track_id,
                            sessionKey: annotationSession,
                            showTrackId: showIds,
                            confidence: showConfidence ? det.confidence : null,
                            fontSize: labelFontSize,
                            padding: (6 * annotationSize) / displayScale,
                        });
                        return;
                    }
                    const { x_min, y_min, x_max, y_max } = det.bbox ?? {};
                    if (![x_min, y_min, x_max, y_max].every(Number.isFinite)) return;
                    const w = x_max - x_min;
                    const h = y_max - y_min;
                    const annotationColor = getAnnotationColor(det.class_name, det.track_id, annotationSession).color;

                    if (showBoundaryBoxes) {
                        ctx.strokeStyle = annotationColor;
                        ctx.strokeRect(x_min, y_min, w, h);
                    }

                    drawAnnotationLabel(ctx, {
                        x: x_min,
                        y: Math.max(0, y_min - (24 * annotationSize) / displayScale),
                        className: showLabels ? det.class_name : "",
                        colorClassName: det.class_name,
                        trackId: det.track_id,
                        sessionKey: annotationSession,
                        showTrackId: showIds,
                        confidence: showConfidence ? det.confidence : null,
                        fontSize: (18 * annotationSize) / displayScale,
                        padding: (6 * annotationSize) / displayScale,
                    });

                });

                segmentations.forEach((segmentation) => {
                    const points = segmentation.polygon ?? [];
                    if (points.length < 2) return;
                    const annotationColor = getAnnotationColor(segmentation.class_name, segmentation.track_id, annotationSession).color;
                    ctx.fillStyle = annotationColor;
                    ctx.globalAlpha = 0.35;
                    ctx.strokeStyle = annotationColor;
                    ctx.beginPath();
                    points.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    ctx.stroke();
                    if (showBoundaryBoxes) {
                        const xs = points.map(([x]) => x);
                        const ys = points.map(([, y]) => y);
                        ctx.strokeStyle = annotationColor;
                        ctx.strokeRect(
                            Math.min(...xs),
                            Math.min(...ys),
                            Math.max(...xs) - Math.min(...xs),
                            Math.max(...ys) - Math.min(...ys),
                        );
                    }
                    const minX = Math.min(...points.map(([x]) => x));
                    const minY = Math.min(...points.map(([, y]) => y));
                    drawAnnotationLabel(ctx, {
                        x: minX,
                        y: Math.max(0, minY - (24 * annotationSize) / displayScale),
                        className: showLabels ? segmentation.class_name : "",
                        colorClassName: segmentation.class_name,
                        trackId: segmentation.track_id,
                        sessionKey: annotationSession,
                        showTrackId: showIds,
                        confidence: showConfidence ? segmentation.confidence : null,
                        fontSize: (18 * annotationSize) / displayScale,
                        padding: (6 * annotationSize) / displayScale,
                    });
                });

                ctx.restore();
            }

            if (frameForOverlay) {
                drawCustomOverlay?.(ctx, frameForOverlay, { width: v.videoWidth, height: v.videoHeight });
            }
        };

        const scheduleDraw = () => {
            if (typeof v.requestVideoFrameCallback === "function") {
                videoFrameCallbackId = v.requestVideoFrameCallback((_, metadata) => {
                    draw(metadata.mediaTime);
                    scheduleDraw();
                });
                return;
            }
            rafId = requestAnimationFrame(() => {
                draw(v.currentTime);
                scheduleDraw();
            });
        };

        draw();
        scheduleDraw();
        return () => {
            cancelAnimationFrame(rafId);
            if (videoFrameCallbackId != null) v.cancelVideoFrameCallback(videoFrameCallbackId);
        };
    }, [predictions, getFrameByTime, selectedClasses, showBoxes, showBoundaryBoxes, showOrientedBoxes, showLabels, showConfidence, showIds, showTrajectory, tracking, confidenceThreshold, annotationSize, annotationSession, drawCustomOverlay]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === videoContainerRef.current);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }

        await videoContainerRef.current?.requestFullscreen();
    };

    const handleTimeUpdate = () => {
        if (videoRef.current && getFrameByTime) {
            const frame = getFrameByTime(videoRef.current.currentTime * 1000, videoRef.current.duration);
            selectedFrameIndexRef.current = predictions?.indexOf(frame) ?? 0;
            setCurrentFrame(frame);
        }
    };

    return (
        <PredictionResultLayout>
        <div className="relative">
            <FixedSpinner loading={isPredicting} message="Processing video..." progress={videoProgress} />
            <div className="w-full rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {showHeader ? <SubHeader content={model.mode.video.subheader} className="text-center" /> : null}
                {supportsTracking ? (
                    <TrackingControls
                        tracking={tracking}
                        onTrackingChange={(nextTracking) => {
                            setTracking(nextTracking);
                            onTrackingChange?.(nextTracking);
                            if (predictions?.length) {
                                void handleConfidenceThresholdChange(confidenceThreshold, nextTracking, tracker);
                            }
                        }}
                        tracker={tracker}
                        onTrackerChange={(nextTracker) => {
                            setTracker(nextTracker);
                            if (tracking && predictions?.length) {
                                void handleConfidenceThresholdChange(confidenceThreshold, true, nextTracker);
                            }
                        }}
                        disabled={isPredicting}
                    />
                ) : null}
                <div
                    className="flex flex-col items-center gap-3"
                    style={isPredicting ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                    aria-busy={isPredicting}
                >
                <VideoUploader
                    label={model.mode.video.uploadLabel}
                    buttonText={model.mode.video.chooseVideo}
                    accept="video/mp4,video/webm,video/ogg"
                    endpoint={videoEndpoint}
                    video={videoFile}
                    onVideoChange={handleVideoChange}
                    onResult={handleVideoResult}
                    onLoadingChange={setIsPredicting}
                    onProgressChange={setVideoProgress}
                    queryParams={{
                        ...model.queryParams,
                        model: model.apiModel ?? (isSegmentation ? "yolo26x-seg" : "yolo26x"),
                        conf: String(confidenceThreshold),
                        ...(supportsTracking ? { tracking: String(tracking), tracker } : {}),
                    }}
                    onPredictionStart={() => {
                        setAnnotationSession((session) => session + 1);
                        setPredictions(null);
                        setCurrentFrame(null);
                        setSelectedClasses([]);
                    }}
                    disabled={isPredicting}
                    ariaLabel={model.mode.video.chooseVideo}
                    fieldName={videoFieldName}
                />
                {model.videoUrlInput ? (
                    <UrlInput
                        label={model.videoUrlInput.label}
                        buttonText={model.videoUrlInput.buttonText}
                        placeholder={model.videoUrlInput.placeholder}
                        imgUrl={videoSourceUrl}
                        setImgUrl={setVideoSourceUrl}
                        endpoint={videoUrlEndpoint}
                        onResult={(result, sourceUrl) => handleVideoUrlResult(result, sourceUrl ?? videoSourceUrl)}
                        queryParamName="source"
                        queryParams={{
                            ...model.queryParams,
                            model: model.apiModel ?? (isSegmentation ? "yolo26x-seg" : "yolo26x"),
                            ...(isSegmentation || model.id === "yolo26-detect-official" ? { output: "json" } : {}),
                            conf: String(confidenceThreshold),
                            ...(supportsTracking ? { tracking: String(tracking), tracker } : {}),
                        }}
                        inputId={`${model.id}-video-url`}
                        disabled={isPredicting}
                        onLoadingChange={setIsPredicting}
                        onProgressChange={setVideoProgress}
                        onPredictionStart={() => {
                            setAnnotationSession((session) => session + 1);
                            setRawPredictions(null);
                            setPredictions(null);
                            setCurrentFrame(null);
                            setSelectedClasses([]);
                        }}
                        mediaType="video"
                        exampleLabel={randomVideoLabel ?? t("ui.randomVideo")}
                        exampleDescription={randomVideoHint}
                        exampleLoadingLabel={t("ui.loadingRandomVideo")}
                        randomClassLabel={t("ui.randomClass")}
                        onExampleClick={() => getRandomVideoUrl(model, randomVideoSearchTerms)}
                    />
                ) : null}
                </div>
            </div>

            {videoUrl && (
                <>
                <FullscreenMediaLayout
                    containerRef={videoContainerRef}
                    isFullscreen={isFullscreen}
                    className={`mt-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${isPredicting ? "pointer-events-none select-none opacity-60 blur-sm" : ""} lg:grid-cols-[minmax(0,1fr)_17rem]`}
                    media={(
                        <div ref={mediaContainerRef} className="relative flex h-full w-full items-center justify-center bg-black">
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                controls={!isPredicting}
                                controlsList="nofullscreen"
                                playsInline
                                onTimeUpdate={handleTimeUpdate}
                                className={`block ${isFullscreen ? "h-full w-full object-contain" : "h-auto max-h-[60vh] w-full object-contain"} rounded-md`}
                            />
                            <canvas ref={canvasRef} className="pointer-events-none absolute" />
                            {renderSplitterOverlay ? (
                                <svg
                                    ref={splitterOverlayRef}
                                    viewBox={`0 0 1000 ${
                                        videoRef.current?.videoWidth && videoRef.current?.videoHeight
                                            ? 1000 * videoRef.current.videoHeight / videoRef.current.videoWidth
                                            : 562.5
                                    }`}
                                    preserveAspectRatio="none"
                                    className="absolute z-10 overflow-visible"
                                    style={{ ...splitterOverlayStyle, pointerEvents: "none" }}
                                    aria-label={model.counter?.splitterAriaLabel}
                                    onPointerMove={onSplitterPointerMove}
                                    onPointerUp={onSplitterPointerUp}
                                    onPointerCancel={onSplitterPointerCancel}
                                >
                                    {predictions?.length ? renderSplitterOverlay(currentFrame, {
                                        width: videoRef.current?.videoWidth ?? 0,
                                        height: videoRef.current?.videoHeight ?? 0,
                                    }) : null}
                                </svg>
                            ) : null}
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                className="absolute right-3 top-3 z-20 rounded-lg bg-black/60 p-2 text-white hover:bg-black/80"
                                aria-label={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                                title={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                            >
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </button>
                        </div>
                    )}
                    controls={(
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3">
                                <button
                                    type="button"
                                    onClick={() => void toggleVideoPlayback()}
                                    disabled={isPredicting}
                                    className="cursor-pointer rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label={isVideoPlaying ? t("ui.pauseVideo") : t("ui.playVideo")}
                                    title={isVideoPlaying ? t("ui.pauseVideo") : t("ui.playVideo")}
                                >
                                    {isVideoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                </button>
                                <button type="button" onClick={toggleFullscreen} className="cursor-pointer rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700" aria-label={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}>
                                    {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                                </button>
                                <button type="button" onClick={() => setShowBoxes((visible) => !visible)} className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
                                    {showBoxes ? t("ui.hideBoxes") : t("ui.showBoxes")}
                                </button>
                            </div>
                            {renderControlsPanel?.(currentFrame)}
                            {playbackError ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{playbackError}</p> : null}
                            <ConfidenceThresholdControl value={confidenceThreshold} onChange={handleConfidenceThresholdChange} />
                            {confidenceError ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{confidenceError}</p> : null}
                            {availableClasses.length > 0 ? <ClassSelector inline classes={availableClasses} selectedClasses={selectedClasses} counts={classCounts} onSelectAll={() => setSelectedClasses(availableClasses)} onClearAll={() => setSelectedClasses([])} onToggle={(className) => setSelectedClasses((current) => current.includes(className) ? current.filter((item) => item !== className) : [...current, className])} /> : null}
                            <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-gray-100">
                                <p className="mb-2 border-b border-gray-700 pb-2 text-center text-sm font-semibold">{t("image.annotationOptions")}</p>
                                <Checkbox checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} className="mb-2 text-xs"><span>{t("image.labels")}</span></Checkbox>
                                <Checkbox checked={showConfidence} onChange={(event) => setShowConfidence(event.target.checked)} className="mb-2 text-xs"><span>{t("image.confidence")}</span></Checkbox>
                                {isOrientedBoundingBox ? (
                                    <Checkbox checked={showOrientedBoxes} onChange={(event) => setShowOrientedBoxes(event.target.checked)} className="text-xs"><span>{t("image.orientedBoxes")}</span></Checkbox>
                                ) : (
                                    <Checkbox checked={showBoundaryBoxes} onChange={(event) => setShowBoundaryBoxes(event.target.checked)} className="text-xs"><span>{t("image.boundaryBoxes")}</span></Checkbox>
                                )}
                                {tracking ? <Checkbox checked={showIds} onChange={(event) => setShowIds(event.target.checked)} className="mt-2 text-xs"><span>{t("ui.objectIds")}</span></Checkbox> : null}
                                {tracking ? <Checkbox checked={showTrajectory} onChange={(event) => setShowTrajectory(event.target.checked)} className="mt-2 text-xs"><span>{t("ui.trajectory")}</span></Checkbox> : null}
                                <AnnotationSizeControl value={annotationSize} onChange={setAnnotationSize} />
                            </div>
                            {isSegmentation ? (
                                <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-gray-100">
                                    <p className="mb-2 border-b border-gray-700 pb-2 text-center text-sm font-semibold">Annotation options</p>
                                    <Checkbox checked={showBoundaryBoxes} onChange={(event) => setShowBoundaryBoxes(event.target.checked)} className="mb-2 text-xs"><span>Boundary boxes</span></Checkbox>
                                    <Checkbox checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} className="mb-2 text-xs"><span>Labels</span></Checkbox>
                                    <Checkbox checked={showConfidence} onChange={(event) => setShowConfidence(event.target.checked)} className="text-xs"><span>Confidence</span></Checkbox>
                                </div>
                            ) : null}
                        </div>
                    )}
                />
            {showApiResponse && videoUrl && predictions?.length ? (
                <VideoApiResponseCard
                    className="lg:col-span-2"
                    frames={predictions}
                    currentFrame={currentFrame}
                    videoRef={videoRef}
                    syncEnabled={syncEnabled}
                    onSyncChange={(event) => setSyncEnabled(event.target.checked)}
                    apiResponseLabel={t("ui.apiResponse")}
                    syncLabel={t("ui.syncVideoFrame")}
                    onSelectFrame={(frame, index) => selectFrame(frame, index)}
                />
            ) : null}
                </>
            )}
        </div>
        </PredictionResultLayout>
    );
};
