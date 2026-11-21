import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";
import { SubHeader } from "../../../components/SubHeader.jsx";
import { VideoUploader } from "../../../components/ui/VideoUploader.jsx";
import { UrlInput } from "../../../components/ui/UrlInput.jsx";
import { FixedSpinner } from "../../../components/ui/FixedSpinner.jsx";
import { getRandomVideoUrl } from "../../../services/mediaService.js";
import { PredictionResultLayout } from "../../../components/ui/PredictionResultLayout.jsx";
import { ConfidenceThresholdControl } from "../../../components/ui/ConfidenceThresholdControl.jsx";
import { FullscreenMediaLayout } from "../../../components/ui/FullscreenMediaLayout.jsx";

export const ClassificationVideo = ({ model, onPredictionStart, onVideoResponseChange }) => {
    const { t } = useLanguage();
    const [videoFile, setVideoFile] = useState(null);
    const [randomClassInputKey, setRandomClassInputKey] = useState(0);
    const [videoUrl, setVideoUrl] = useState("");
    const [videoSourceUrl, setVideoSourceUrl] = useState("");
    const [frames, setFrames] = useState([]);
    const [currentFrame, setCurrentFrame] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPredicting, setIsPredicting] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [syncEnabled, setSyncEnabled] = useState(false);
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const endpoint = `${API_URL}/api/${model.apiPath ?? "classification"}/predict/video`;
    const videoUrlEndpoint = endpoint;
    const [randomClass, setRandomClass] = useState("");
    const normalizedRandomClass = randomClass.toLowerCase().replace(/[_-]+/g, " ").trim();
    const selectFrame = useCallback((frame, index) => {
        setCurrentFrame(frame);
        const video = videoRef.current;
        if (!video || video.readyState < 1) return;
        video.currentTime = frame.timestamp_ms != null
            ? frame.timestamp_ms / 1000
            : (video.duration || 0) * (index / Math.max(frames.length - 1, 1));
    }, [frames.length]);
    const handleSyncChange = useCallback((event) => {
        setSyncEnabled(event.target.checked);
    }, []);
    const handlePredictionStart = useCallback(() => {
        setFrames([]);
        setCurrentFrame(null);
        setSyncEnabled(false);
        onPredictionStart?.();
    }, [onPredictionStart]);

    useEffect(() => () => {
        if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    }, [videoUrl]);

    useEffect(() => {
        onVideoResponseChange?.({
            frames,
            currentFrame,
            videoRef,
            onSelectFrame: selectFrame,
            syncEnabled,
            onSyncChange: handleSyncChange,
        });
    }, [currentFrame, frames, handleSyncChange, onVideoResponseChange, selectFrame, syncEnabled]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const handleVideoChange = (file) => {
        setVideoFile(file);
        setVideoSourceUrl("");
        setRandomClass("");
        setRandomClassInputKey((key) => key + 1);
        setFrames([]);
        setCurrentFrame(null);
        if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
        setVideoUrl(file ? URL.createObjectURL(file) : "");
    };

    return (
        <PredictionResultLayout>
        <div className="relative flex flex-col items-center">
            <FixedSpinner loading={isPredicting} message="Processing video..." progress={videoProgress} />
            <div className="w-full rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <SubHeader content={model.mode.video.subheader} className="text-center" />
            <div
                className="flex w-full flex-col items-center gap-3"
                style={isPredicting ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                aria-busy={isPredicting}
            >
                <VideoUploader
                    label={model.mode.video.uploadLabel}
                    buttonText={model.mode.video.chooseVideo}
                    endpoint={endpoint}
                    queryParams={{ model: model.apiModel ?? "yolo26x-cls" }}
                    fieldName={model.videoFieldName}
                    video={videoFile}
                    onVideoChange={handleVideoChange}
                    onResult={(result) => {
                        const nextFrames = Array.isArray(result) ? result : [];
                        setFrames(nextFrames);
                        setCurrentFrame(nextFrames[0] ?? null);
                    }}
                    onLoadingChange={setIsPredicting}
                    onProgressChange={setVideoProgress}
                    onPredictionStart={handlePredictionStart}
                    disabled={isPredicting}
                    ariaLabel={model.mode.video.chooseVideo}
                />
                {model.videoUrlInput ? (
                    <UrlInput
                        key={randomClassInputKey}
                        label={model.videoUrlInput.label}
                        buttonText={model.videoUrlInput.buttonText}
                        placeholder={model.videoUrlInput.placeholder}
                        imgUrl={videoSourceUrl}
                        setImgUrl={setVideoSourceUrl}
                        endpoint={videoUrlEndpoint}
                        queryParams={{ model: model.apiModel ?? "yolo26x-cls" }}
                        queryParamName={model.videoUrlInput.queryParamName ?? "source"}
                        inputId={`${model.id}-video-url`}
                        disabled={isPredicting}
                        onLoadingChange={setIsPredicting}
                        onPredictionStart={handlePredictionStart}
                        onProgressChange={setVideoProgress}
                        mediaType="video"
                        exampleLabel={t("ui.randomVideo")}
                        exampleLoadingLabel={t("ui.loadingRandomVideo")}
                        randomClassLabel={t("ui.randomClass")}
                        randomClassMatched={randomClass && currentFrame ? Boolean(currentFrame.classifications?.some((prediction) => (
                            prediction.class_name?.toLowerCase().replace(/[_-]+/g, " ").trim() === normalizedRandomClass
                        ))) : undefined}
                        onRandomClassChange={setRandomClass}
                        onExampleClick={() => getRandomVideoUrl(model)}
                        onResult={(result, sourceUrl) => {
                            const nextFrames = Array.isArray(result) ? result : [];
                            setFrames(nextFrames);
                            setCurrentFrame(nextFrames[0] ?? null);
                            setVideoFile(null);
                            setVideoSourceUrl(sourceUrl ?? videoSourceUrl);
                            setVideoUrl(sourceUrl ?? videoSourceUrl);
                        }}
                    />
                ) : null}
            </div>
            </div>
            {videoUrl ? (
                <FullscreenMediaLayout
                    containerRef={containerRef}
                    isFullscreen={isFullscreen}
                    className={`mt-4 w-full max-w-6xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${isPredicting ? "pointer-events-none select-none opacity-60 blur-sm" : ""} lg:grid-cols-[minmax(0,1fr)_20rem]`}
                    media={(
                        <div className="relative flex h-full w-full items-center justify-center">
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                controls
                                controlsList="nofullscreen"
                                onTimeUpdate={() => {
                                    const video = videoRef.current;
                                    const currentTime = video?.currentTime ?? 0;
                                    const timestamp = currentTime * 1000;
                                    const hasTimestamps = frames.some((frame) => frame.timestamp_ms != null);
                                    const target = hasTimestamps
                                        ? timestamp
                                        : (currentTime / (video?.duration || 1)) * Math.max(frames.length - 1, 0);
                                    setCurrentFrame(frames.reduce((closest, frame, index) => {
                                        const framePosition = hasTimestamps ? frame.timestamp_ms : (frame.frame_index ?? index);
                                        const closestPosition = hasTimestamps
                                            ? closest?.timestamp_ms
                                            : (closest?.frame_index ?? frames.indexOf(closest));
                                        return Math.abs(framePosition - target) < Math.abs(closestPosition - target)
                                            ? frame
                                            : closest;
                                    }, frames[0] ?? null));
                                }}
                                className={`rounded-xl bg-black ${isFullscreen ? "h-full w-full max-h-full max-w-full object-contain" : "h-auto w-full"}`}
                            />
                            <button
                                type="button"
                                onClick={async () => {
                                    if (document.fullscreenElement) {
                                        await document.exitFullscreen();
                                    } else {
                                        await containerRef.current?.requestFullscreen();
                                    }
                                }}
                                className="absolute right-3 top-3 z-50 rounded-lg bg-black/70 p-2 text-white hover:bg-black/90"
                                aria-label={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                            >
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </button>
                        </div>
                    )}
                    controls={(
                        <div className={`space-y-4 ${isFullscreen ? "" : "rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"}`}>
                            <ConfidenceThresholdControl value={confidenceThreshold} onChange={setConfidenceThreshold} />
                            {currentFrame?.classifications?.length ? (
                                <>
                                    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("ui.topPrediction")}</div>
                                        <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                                            {currentFrame.classifications[0]?.class_name ?? t("ui.noPredictions")}
                                        </div>
                                        {currentFrame.classifications[0] ? (
                                            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                                {t("ui.confidence")}: {(currentFrame.classifications[0].confidence * 100).toFixed(1)}%
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("ui.rankedPredictions")}</div>
                                        <div className="mt-4 space-y-3">
                                            {currentFrame.classifications
                                                .filter((prediction) => prediction.confidence >= confidenceThreshold)
                                                .slice(0, 5)
                                                .map((prediction) => (
                                                    <div key={`${prediction.class_name}-${prediction.class_id}`} className="space-y-1">
                                                        <div className="flex items-center justify-between gap-3 text-sm">
                                                            <span className="font-medium text-gray-800 dark:text-gray-100">{prediction.class_name}</span>
                                                            <span className="text-gray-500 dark:text-gray-400">{(prediction.confidence * 100).toFixed(1)}%</span>
                                                        </div>
                                                        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                                            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(prediction.confidence * 100, 2)}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </>
                            ) : <p className="mt-3 text-sm text-gray-500">{t("ui.noPredictions")}</p>}
                        </div>
                    )}
                />
            ) : null}
        </div>
        </PredictionResultLayout>
    );
};
