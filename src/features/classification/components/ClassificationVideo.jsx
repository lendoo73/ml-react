import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";
import { SubHeader } from "../../../components/SubHeader.jsx";
import { VideoUploader } from "../../../components/ui/VideoUploader.jsx";
import { UrlInput } from "../../../components/ui/UrlInput.jsx";
import { FixedSpinner } from "../../../components/ui/FixedSpinner.jsx";
import { getRandomVideoUrl } from "../../../services/mediaService.js";

export const ClassificationVideo = ({ model, onChange }) => {
    const { t } = useLanguage();
    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [videoSourceUrl, setVideoSourceUrl] = useState("");
    const [frames, setFrames] = useState([]);
    const [currentFrame, setCurrentFrame] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPredicting, setIsPredicting] = useState(false);
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const endpoint = `${API_URL}/api/${model.apiPath}/${model.endpoints.video}`;
    const videoUrlEndpoint = `${API_URL}/api/${model.apiPath}/predict/video`;
    const [randomClass, setRandomClass] = useState("");
    const normalizedRandomClass = randomClass.toLowerCase().replace(/[_-]+/g, " ").trim();

    useEffect(() => () => {
        if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    }, [videoUrl]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const handleVideoChange = (file) => {
        setVideoFile(file);
        setFrames([]);
        setCurrentFrame(null);
        if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
        setVideoUrl(file ? URL.createObjectURL(file) : "");
    };

    return (
        <div className="relative flex flex-col items-center">
            <FixedSpinner loading={isPredicting} message="Processing video..." />
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
                    fieldName={model.videoFieldName}
                    video={videoFile}
                    onVideoChange={handleVideoChange}
                    onResult={(result) => {
                        const nextFrames = Array.isArray(result) ? result : [];
                        setFrames(nextFrames);
                        setCurrentFrame(nextFrames[0] ?? null);
                        onChange(result);
                    }}
                    onLoadingChange={setIsPredicting}
                    onPredictionStart={() => {
                        setFrames([]);
                        setCurrentFrame(null);
                    }}
                    disabled={isPredicting}
                    ariaLabel={model.mode.video.chooseVideo}
                />
                {model.videoUrlInput ? (
                    <UrlInput
                        label={model.videoUrlInput.label}
                        buttonText={model.videoUrlInput.buttonText}
                        placeholder={model.videoUrlInput.placeholder}
                        imgUrl={videoSourceUrl}
                        setImgUrl={setVideoSourceUrl}
                        endpoint={videoUrlEndpoint}
                        queryParamName={model.videoUrlInput.queryParamName ?? "source"}
                        inputId={`${model.id}-video-url`}
                        disabled={isPredicting}
                        onLoadingChange={setIsPredicting}
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
                            onChange(result);
                        }}
                    />
                ) : null}
            </div>
            </div>
            {videoUrl ? (
                <div
                    ref={containerRef}
                    className={`relative mt-4 w-full rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${isFullscreen ? "fixed inset-0 z-50 h-[100dvh] w-[100dvw] overflow-hidden rounded-none border-0 bg-black p-0" : "max-w-6xl"}`}
                >
                    <div className={`grid w-full gap-4 ${isFullscreen ? "h-full grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_20rem]"}`}>
                        <div className={`relative ${isFullscreen ? "flex min-h-0 min-w-0 items-center justify-center" : ""}`}>
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
                                className={`rounded-xl bg-black ${isFullscreen ? "max-h-full max-w-full object-contain" : "h-auto w-full"}`}
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
                        <div className={`rounded-xl p-4 shadow-sm ${isFullscreen
                            ? "absolute right-4 top-1/2 z-30 max-h-[calc(100dvh-2rem)] w-[min(20rem,calc(100vw-2rem))] -translate-y-1/2 overflow-y-auto border border-white/30 bg-black/60 text-white backdrop-blur-sm"
                            : "border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"}`}>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("ui.currentPrediction")}</p>
                            {currentFrame?.classifications?.length ? (
                                <div className="mt-3 space-y-3">
                                    {currentFrame.classifications.slice(0, 5).map((prediction) => (
                                        <div key={`${prediction.class_name}-${prediction.class_id}`}>
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">{prediction.class_name}</span>
                                                <span>{(prediction.confidence * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${prediction.confidence * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="mt-3 text-sm text-gray-500">{t("ui.noPredictions")}</p>}
                        </div>
                    </div>
                    {!isFullscreen ? (
                        <div className="mt-6 w-full overflow-hidden rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                            <div className="rounded-lg bg-blue-100 px-6 py-3 text-center text-lg font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {t("ui.apiResponse")}
                            </div>
                            <div className="max-h-64 overflow-y-auto bg-white p-4 text-sm dark:bg-gray-800">
                                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(frames, null, 4)}</pre>
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{t("ui.classificationVideoResultsNote")}</p>
        </div>
    );
};
