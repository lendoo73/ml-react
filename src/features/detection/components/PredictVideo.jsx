
import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
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

export const PredictVideo = ({ model, showHeader = true }) => {
    const { t } = useLanguage();
    const endpointBase = `${API_URL}/api/${model.apiPath}`;
    const videoEndpoint = `${endpointBase}/${model.endpoints.video}`;
    const videoUrlEndpoint = `${endpointBase}/predict/video`;
    const videoFieldName = model.videoFieldName;

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [videoSourceUrl, setVideoSourceUrl] = useState("");
    const [predictions, setPredictions] = useState(null);
    const [currentFrame, setCurrentFrame] = useState(null);
    const [isPredicting, setIsPredicting] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0);
    const [syncEnabled, setSyncEnabled] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [showBoxes, setShowBoxes] = useState(true);
    const [showBoundaryBoxes, setShowBoundaryBoxes] = useState(model.resultType !== "segmentation");
    const [showLabels, setShowLabels] = useState(true);
    const [showConfidence, setShowConfidence] = useState(true);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [annotationSize, setAnnotationSize] = useState(1);
    const videoContainerRef = useRef(null);

    const getFrameByTime = useMemo(() => makeTimestampIndex(predictions), [predictions]);

    const handleVideoChange = (file) => {
        setPredictions(null);
        setVideoFile(file);
        setVideoSourceUrl("");
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        if (file) setVideoUrl(URL.createObjectURL(file));
        else setVideoUrl("");
    };

    const handleVideoResult = (result) => {
        setPredictions(Array.isArray(result) ? result : null);
        setSelectedClasses(getPredictionClasses(result));
        setCurrentFrame(Array.isArray(result) ? result[0] ?? null : null);
    };

    const handleVideoUrlResult = (result, sourceUrl) => {
        setPredictions(Array.isArray(result) ? result : null);
        setSelectedClasses(getPredictionClasses(result));
        setCurrentFrame(Array.isArray(result) ? result[0] ?? null : null);
        setVideoFile(null);
        setVideoSourceUrl(sourceUrl);
        if (videoUrl && videoUrl !== sourceUrl && videoFile) URL.revokeObjectURL(videoUrl);
        setVideoUrl(sourceUrl);
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
                const containerRect = videoContainerRef.current?.getBoundingClientRect();
                c.width = w;
                c.height = h;
                c.style.width = `${renderedWidth}px`;
                c.style.height = `${renderedHeight}px`;
                c.style.left = `${(videoRect.left - (containerRect?.left ?? videoRect.left)) + (videoRect.width - renderedWidth) / 2}px`;
                c.style.top = `${(videoRect.top - (containerRect?.top ?? videoRect.top)) + (videoRect.height - renderedHeight) / 2}px`;
            }
        };

        v.addEventListener("loadedmetadata", syncSize);
        window.addEventListener("resize", syncSize);
        const resizeObserver = new ResizeObserver(() => requestAnimationFrame(syncSize));
        resizeObserver.observe(v);
        if (videoContainerRef.current) resizeObserver.observe(videoContainerRef.current);
        syncSize();

        return () => {
            v.removeEventListener("loadedmetadata", syncSize);
            window.removeEventListener("resize", syncSize);
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
            ctx.clearRect(0, 0, c.width, c.height);
            const displayScale = c.clientWidth / c.width || 1;

            if (showBoxes && predictions && !isNaN(mediaTime)) {
                const ms = Math.floor(mediaTime * 1000);
                const frame = getFrameByTime(ms, v.duration);
                const detections = (frame?.detections ?? [])
                    .filter((detection) => selectedClasses.includes(detection.class_name))
                    .filter((detection) => (detection.confidence ?? 0) >= confidenceThreshold);
                const segmentations = (frame?.segmentations ?? [])
                    .filter((segmentation) => selectedClasses.includes(segmentation.class_name))
                    .filter((segmentation) => (segmentation.confidence ?? 0) >= confidenceThreshold);

                ctx.save();
                ctx.lineWidth = Math.max(1, (3 * annotationSize) / displayScale);
                ctx.font = `${(18 * annotationSize) / displayScale}px system-ui, sans-serif`;

                detections.forEach((det) => {
                    const { x_min, y_min, x_max, y_max } = det.bbox;
                    const w = x_max - x_min;
                    const h = y_max - y_min;

                    if (showBoundaryBoxes) {
                        ctx.strokeStyle = "rgba(255, 215, 0, 0.95)";
                        ctx.strokeRect(x_min, y_min, w, h);
                    }

                    const label = `${showLabels ? det.class_name : ""}${showConfidence ? ` ${(det.confidence * 100).toFixed(1)}%` : ""}`.trim();
                    const pad = 4 * annotationSize;
                    const textW = ctx.measureText(label).width;
                    const textH = (22 * annotationSize) / displayScale;
                    if (label) {
                        ctx.fillStyle = "rgba(0,0,0,0.6)";
                        ctx.fillRect(x_min, Math.max(0, y_min - textH - 2), textW + pad * 2, textH + pad);
                        ctx.fillStyle = "#fff";
                        ctx.fillText(label, x_min + pad, Math.max(10, y_min - 4));
                    }

                });

                segmentations.forEach((segmentation) => {
                    const points = segmentation.polygon ?? [];
                    if (points.length < 2) return;
                    ctx.fillStyle = "rgba(34, 197, 94, 0.35)";
                    ctx.strokeStyle = "rgba(34, 197, 94, 0.95)";
                    ctx.beginPath();
                    points.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    if (showBoundaryBoxes) {
                        const xs = points.map(([x]) => x);
                        const ys = points.map(([, y]) => y);
                        ctx.strokeStyle = "rgba(255, 0, 0, 0.95)";
                        ctx.strokeRect(
                            Math.min(...xs),
                            Math.min(...ys),
                            Math.max(...xs) - Math.min(...xs),
                            Math.max(...ys) - Math.min(...ys),
                        );
                    }
                    const label = `${showLabels ? segmentation.class_name : ""}${showConfidence ? ` ${(segmentation.confidence * 100).toFixed(1)}%` : ""}`.trim();
                    if (label) {
                        ctx.fillStyle = "#fff";
                        ctx.fillText(label, points[0][0], points[0][1]);
                    }
                });

                ctx.restore();
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
    }, [predictions, getFrameByTime, selectedClasses, showBoxes, showBoundaryBoxes, showLabels, showConfidence, confidenceThreshold, annotationSize]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === videoContainerRef.current);
            requestAnimationFrame(() => {
                const video = videoRef.current;
                if (video) {
                    video.dispatchEvent(new Event("loadedmetadata"));
                }
            });
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
            setCurrentFrame(getFrameByTime(videoRef.current.currentTime * 1000, videoRef.current.duration));
        }
    };

    return (
        <PredictionResultLayout>
        <div className="relative">
            <FixedSpinner loading={isPredicting} message="Processing video..." progress={videoProgress} />
            <div className="w-full rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {showHeader ? <SubHeader content={model.mode.video.subheader} className="text-center" /> : null}
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
                    onPredictionStart={() => {
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
                        queryParamName={model.videoUrlInput.queryParamName ?? "source"}
                        queryParams={model.videoUrlInput.queryParams ?? {}}
                        inputId={`${model.id}-video-url`}
                        disabled={isPredicting}
                        onLoadingChange={setIsPredicting}
                        onProgressChange={setVideoProgress}
                        mediaType="video"
                        exampleLabel={t("ui.randomVideo")}
                        exampleLoadingLabel={t("ui.loadingRandomVideo")}
                        randomClassLabel={t("ui.randomClass")}
                        onExampleClick={() => getRandomVideoUrl(model)}
                    />
                ) : null}
                </div>
            </div>

            {videoUrl && (
                <div className={`mt-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${isPredicting ? "pointer-events-none select-none opacity-60 blur-sm" : ""} ${isFullscreen ? "grid grid-cols-1" : "grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]"}`}>
                <div
                    ref={videoContainerRef}
                    className={`relative bg-black ${isFullscreen ? "fixed inset-0 z-10 flex h-[100dvh] w-[100dvw] items-center justify-center overflow-hidden" : "w-full"}`}
                >
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        controls={!isPredicting}
                        controlsList="nofullscreen"
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        className={`block ${isFullscreen ? "h-full w-full object-contain" : "h-auto w-full"} rounded-md`}
                        onLoadedMetadata={() => {
                            const v = videoRef.current;
                            const c = canvasRef.current;
                            if (v && c) {
                                c.style.position = "absolute";
                                c.style.left = "0";
                                c.style.top = "0";
                                c.style.pointerEvents = "none";
                            }
                        }}
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute pointer-events-none"
                    />
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
                {!isFullscreen ? (
                    <aside className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3">
                        <button type="button" onClick={toggleFullscreen} className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700" aria-label={t("ui.enterFullscreen")}>
                            <Maximize className="h-5 w-5" />
                        </button>
                        <button type="button" onClick={() => setShowBoxes((visible) => !visible)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
                        {showBoxes ? t("ui.hideBoxes") : t("ui.showBoxes")}
                        </button>
                        </div>
                        <ConfidenceThresholdControl value={confidenceThreshold} onChange={setConfidenceThreshold} />
                        {availableClasses.length > 0 ? <ClassSelector inline classes={availableClasses} selectedClasses={selectedClasses} counts={classCounts} onSelectAll={() => setSelectedClasses(availableClasses)} onClearAll={() => setSelectedClasses([])} onToggle={(className) => setSelectedClasses((current) => current.includes(className) ? current.filter((item) => item !== className) : [...current, className])} /> : null}
                        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-gray-100">
                            <p className="mb-2 border-b border-gray-700 pb-2 text-center text-sm font-semibold">{t("image.annotationOptions")}</p>
                            <Checkbox checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} className="mb-2 text-xs"><span>{t("image.labels")}</span></Checkbox>
                            <Checkbox checked={showConfidence} onChange={(event) => setShowConfidence(event.target.checked)} className="mb-2 text-xs"><span>{t("image.confidence")}</span></Checkbox>
                            <Checkbox checked={showBoundaryBoxes} onChange={(event) => setShowBoundaryBoxes(event.target.checked)} className="text-xs"><span>{t("image.boundaryBoxes")}</span></Checkbox>
                            <AnnotationSizeControl value={annotationSize} onChange={setAnnotationSize} />
                        </div>
                        {model.resultType === "segmentation" ? (
                            <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-gray-100">
                                <p className="mb-2 border-b border-gray-700 pb-2 text-center text-sm font-semibold">Annotation options</p>
                                <Checkbox checked={showBoundaryBoxes} onChange={(event) => setShowBoundaryBoxes(event.target.checked)} className="mb-2 text-xs"><span>Boundary boxes</span></Checkbox>
                                <Checkbox checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} className="mb-2 text-xs"><span>Labels</span></Checkbox>
                                <Checkbox checked={showConfidence} onChange={(event) => setShowConfidence(event.target.checked)} className="text-xs"><span>Confidence</span></Checkbox>
                            </div>
                        ) : null}
                    </aside>
                ) : null}
            {videoUrl && predictions?.length ? (
                <VideoApiResponseCard
                    className="lg:col-span-2"
                    frames={predictions}
                    currentFrame={currentFrame}
                    syncEnabled={syncEnabled}
                    onSyncChange={(event) => setSyncEnabled(event.target.checked)}
                    apiResponseLabel={t("ui.apiResponse")}
                    syncLabel={t("ui.syncVideoFrame")}
                    onSelectFrame={(frame, index) => {
                        const video = videoRef.current;
                        if (video) {
                            video.currentTime = frame.timestamp_ms != null
                                ? frame.timestamp_ms / 1000
                                : (video.duration || 0) * (index / Math.max(predictions.length - 1, 1));
                        }
                        setCurrentFrame(frame);
                    }}
                />
            ) : null}
                </div>
            )}
        </div>
        </PredictionResultLayout>
    );
};
