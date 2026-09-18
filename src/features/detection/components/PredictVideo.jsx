
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

const makeTimestampIndex = (frames) => {
    if (!Array.isArray(frames)) return () => null;
    const hasTimestamps = frames.some((frame) => frame?.timestamp_ms != null);
    const frameIndexes = frames.map((frame, index) => frame?.frame_index ?? index);
    const ts = frames.map((frame, index) => frame?.timestamp_ms ?? frameIndexes[index]);
    return (ms, duration) => {
        if (ts.length === 0) return null;
        if (!hasTimestamps) {
            if (duration > 0) {
                const targetIndex = (ms / 1000 / duration) * (frames.length - 1);
                return frames.reduce((closest, frame, index) => (
                    Math.abs(index - targetIndex) < Math.abs(closest.index - targetIndex)
                        ? { frame, index }
                        : closest
                ), { frame: frames[0], index: 0 }).frame;
            }
        }

        let bestIdx = 0;
        let bestDiff = Math.abs(ms - ts[0]);
        for (let i = 1; i < ts.length; i++) {
            const d = Math.abs(ms - ts[i]);
            if (d < bestDiff) {
                bestDiff = d;
                bestIdx = i;
            }
        }
        return frames[bestIdx] ?? null;
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedClasses, setSelectedClasses] = useState([]);
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

        const draw = () => {
            const videoRect = v.getBoundingClientRect();
            const containerRect = videoContainerRef.current?.getBoundingClientRect();
            if (containerRect && videoRect.width && videoRect.height) {
                const naturalWidth = v.videoWidth || videoRect.width;
                const naturalHeight = v.videoHeight || videoRect.height;
                const videoAspect = naturalWidth / naturalHeight;
                const elementAspect = videoRect.width / videoRect.height;
                const renderedWidth = elementAspect > videoAspect
                    ? videoRect.height * videoAspect
                    : videoRect.width;
                const renderedHeight = elementAspect > videoAspect
                    ? videoRect.height
                    : videoRect.width / videoAspect;
                c.width = naturalWidth;
                c.height = naturalHeight;
                c.style.left = `${videoRect.left - containerRect.left + (videoRect.width - renderedWidth) / 2}px`;
                c.style.top = `${videoRect.top - containerRect.top + (videoRect.height - renderedHeight) / 2}px`;
                c.style.width = `${renderedWidth}px`;
                c.style.height = `${renderedHeight}px`;
            }

            ctx.clearRect(0, 0, c.width, c.height);

            if (predictions && !isNaN(v.currentTime)) {
                const ms = Math.floor(v.currentTime * 1000);
                const frame = getFrameByTime(ms, v.duration);
                const detections = (frame?.detections ?? [])
                    .filter((detection) => selectedClasses.includes(detection.class_name));
                const segmentations = (frame?.segmentations ?? [])
                    .filter((segmentation) => selectedClasses.includes(segmentation.class_name));

                ctx.save();
                ctx.lineWidth = 2;
                ctx.font = "14px system-ui, sans-serif";

                detections.forEach((det) => {
                    const { x_min, y_min, x_max, y_max } = det.bbox;
                    const w = x_max - x_min;
                    const h = y_max - y_min;

                    ctx.strokeStyle = "rgba(255, 215, 0, 0.95)"; // gold-ish
                    ctx.strokeRect(x_min, y_min, w, h);

                    const label = `${det.class_name} ${(det.confidence * 100).toFixed(1)}%`;
                    const pad = 4;
                    const textW = ctx.measureText(label).width;
                    const textH = 16; // approx
                    ctx.fillStyle = "rgba(0,0,0,0.6)";
                    ctx.fillRect(x_min, Math.max(0, y_min - textH - 2), textW + pad * 2, textH + pad);

                    // Label text
                    ctx.fillStyle = "#fff";
                    ctx.fillText(label, x_min + pad, Math.max(10, y_min - 4));

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
                    ctx.fillStyle = "#fff";
                    ctx.fillText(`${segmentation.class_name} ${(segmentation.confidence * 100).toFixed(1)}%`, points[0][0], points[0][1]);
                });

                ctx.restore();
            }

            rafId = requestAnimationFrame(draw);
        };

        rafId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafId);
    }, [predictions, getFrameByTime, selectedClasses]);

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
        <div className="relative">
            <FixedSpinner loading={isPredicting} message="Processing video..." />
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
                        mediaType="video"
                        exampleLabel={t("ui.randomVideo")}
                        exampleLoadingLabel={t("ui.loadingRandomVideo")}
                        randomClassLabel={t("ui.randomClass")}
                        onExampleClick={() => getRandomVideoUrl(model)}
                    />
                ) : null}
            </div>

            {videoUrl && (
                <div
                    ref={videoContainerRef}
                    className={`relative mt-4 bg-black ${isFullscreen ? "fixed inset-0 z-10 flex h-[100dvh] w-[100dvw] items-center justify-center overflow-hidden" : "w-full max-w-[960px]"}`}
                >
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        controls={!isPredicting}
                        controlsList="nofullscreen"
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        className={`block ${isFullscreen ? "max-h-full max-w-full object-contain" : "h-auto w-full"} rounded-md`}
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
                    {availableClasses.length > 0 ? (
                        <ClassSelector
                            classes={availableClasses}
                            selectedClasses={selectedClasses}
                            counts={classCounts}
                            onSelectAll={() => setSelectedClasses(availableClasses)}
                            onClearAll={() => setSelectedClasses([])}
                            onToggle={(className) => setSelectedClasses((currentClasses) => (
                                currentClasses.includes(className)
                                    ? currentClasses.filter((currentClass) => currentClass !== className)
                                    : [...currentClasses, className]
                            ))}
                            className="bottom-20"
                        />
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
        </div>
    );
};
