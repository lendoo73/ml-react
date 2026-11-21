import { useEffect, useRef, useState } from "react";
import { UrlInput } from "../../../components/ui/UrlInput.jsx";
import { VideoUploader } from "../../../components/ui/VideoUploader.jsx";
import { VideoApiResponseCard } from "../../../components/ui/VideoApiResponseCard.jsx";
import { PredictionResultLayout } from "../../../components/ui/PredictionResultLayout.jsx";
import { useLanguage } from "../../../context/useLanguage.js";
import { API_URL } from "../../../config/settings.js";
import { FixedSpinner } from "../../../components/ui/FixedSpinner.jsx";
import { getRandomVideoUrl } from "../../../services/mediaService.js";
import { PosePredictionResult } from "./PosePredictionResult.jsx";
import { TrackingControls } from "../../../components/ui/TrackingControls.jsx";

export const PoseVideo = ({
    model,
    previewSearchTerms,
    onChange,
    onPredictionStart,
    angles,
    renderFrameContent,
    defaultSelectedKeypoints,
    defaultShowLabels,
    defaultShowConfidence,
    counterVisibility,
    onCounterVisibilityChange,
    counterLabels,
    counterPersonLabel,
    transformResult,
    apiResponseTooltip,
}) => {
    const { t } = useLanguage();
    const [videoFile, setVideoFile] = useState(null);
    const [fileVideoUrl, setFileVideoUrl] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [result, setResult] = useState(null);
    const [currentFrame, setCurrentFrame] = useState(null);
    const [syncEnabled, setSyncEnabled] = useState(false);
    const [isPredicting, setIsPredicting] = useState(false);
    const [error, setError] = useState("");
    const [videoProgress, setVideoProgress] = useState(0);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [tracking, setTracking] = useState(false);
    const [tracker, setTracker] = useState("bytetrack");
    const [showIds, setShowIds] = useState(true);
    const [annotationSession, setAnnotationSession] = useState(0);
    const videoRef = useRef(null);
    const fileVideoUrlRef = useRef("");
    const fileEndpoint = `${API_URL}/api/pose_estimation/predict/video`;
    const urlEndpoint = fileEndpoint;
    const videoSource = videoFile ? fileVideoUrl : videoUrl;

    const handleVideoFileChange = (nextFile) => {
        if (fileVideoUrlRef.current) URL.revokeObjectURL(fileVideoUrlRef.current);
        const nextUrl = nextFile ? URL.createObjectURL(nextFile) : "";
        fileVideoUrlRef.current = nextUrl;
        setFileVideoUrl(nextUrl);
        setVideoFile(nextFile);
    };

    useEffect(() => () => {
        if (fileVideoUrlRef.current) URL.revokeObjectURL(fileVideoUrlRef.current);
    }, []);

    const queryParams = angles
        ? { angles: JSON.stringify(angles), output: "json" }
        : { tracking: String(tracking), tracker };

    const handleResult = (nextResult, source) => {
        const frames = Array.isArray(nextResult) ? nextResult : [];
        const processedFrames = transformResult ? transformResult(frames) : frames;
        setError("");
        setResult(processedFrames);
        setCurrentFrame(processedFrames[0] ?? null);
        setConfidenceThreshold(0.5);
        onChange?.(processedFrames, source ?? (videoFile ?? videoUrl));
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !result?.length) return undefined;

        const syncFrame = (mediaTime) => {
            const framePosition = video.duration > 0
                ? (mediaTime / video.duration) * (result.length - 1)
                : 0;
            const nextFrame = result[Math.round(framePosition)] ?? null;
            setCurrentFrame((currentFrameValue) => (
                currentFrameValue === nextFrame ? currentFrameValue : nextFrame
            ));
        };
        const handleSeeked = () => syncFrame(video.currentTime);

        if (typeof video.requestVideoFrameCallback === "function") {
            let callbackId;
            const handleVideoFrame = (_, metadata) => {
                syncFrame(metadata.mediaTime);
                callbackId = video.requestVideoFrameCallback(handleVideoFrame);
            };
            callbackId = video.requestVideoFrameCallback(handleVideoFrame);
            video.addEventListener("seeked", handleSeeked);
            return () => {
                video.cancelVideoFrameCallback(callbackId);
                video.removeEventListener("seeked", handleSeeked);
            };
        }

        video.addEventListener("timeupdate", handleSeeked);
        video.addEventListener("seeked", handleSeeked);
        return () => {
            video.removeEventListener("timeupdate", handleSeeked);
            video.removeEventListener("seeked", handleSeeked);
        };
    }, [result, videoSource]);

    const selectFrame = (frame, index) => {
        const video = videoRef.current;
        if (video && video.duration > 0) {
            video.currentTime = video.duration * (index / Math.max(result.length - 1, 1));
        }
        setCurrentFrame(frame);
    };

    return (
        <PredictionResultLayout>
            <div className="relative space-y-6">
                <FixedSpinner
                    loading={isPredicting}
                    message={t("ui.processingVideo")}
                    progress={videoProgress}
                />
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    {angles ? null : (
                        <TrackingControls
                            tracking={tracking}
                            onTrackingChange={setTracking}
                            tracker={tracker}
                            onTrackerChange={setTracker}
                            disabled={isPredicting}
                        />
                    )}
                    <div className="flex w-full flex-col items-center gap-4">
                        <VideoUploader
                            label={model?.mode?.video?.uploadLabel}
                            buttonText={model?.mode?.video?.chooseVideo}
                            endpoint={fileEndpoint}
                            fieldName="source"
                            video={videoFile}
                            onVideoChange={(nextFile) => {
                                handleVideoFileChange(nextFile);
                                setError("");
                                if (nextFile) setVideoUrl("");
                                setResult(null);
                                setCurrentFrame(null);
                                onPredictionStart?.();
                            }}
                            onError={setError}
                            onPredictionStart={() => {
                                setError("");
                                setAnnotationSession((session) => session + 1);
                            }}
                            onResult={(nextResult) => handleResult(nextResult, videoFile)}
                            onLoadingChange={setIsPredicting}
                            onProgressChange={setVideoProgress}
                            queryParams={queryParams}
                        />
                        <UrlInput
                            label={model?.videoUrlInput?.label}
                            buttonText={model?.videoUrlInput?.buttonText}
                            placeholder={model?.videoUrlInput?.placeholder}
                            imgUrl={videoUrl}
                            setImgUrl={(value) => {
                                setVideoUrl(value);
                                if (value) handleVideoFileChange(null);
                                setResult(null);
                                setCurrentFrame(null);
                            }}
                            endpoint={urlEndpoint}
                            queryParamName="source"
                            queryParams={{ ...(model?.urlQueryParams ?? {}), ...queryParams }}
                            inputId={`${model?.id ?? "model"}-video-url`}
                            onResult={(nextResult, sourceUrl) => handleResult(nextResult, sourceUrl ?? videoUrl)}
                            onPredictionStart={() => {
                                setError("");
                                setAnnotationSession((session) => session + 1);
                                onPredictionStart?.();
                            }}
                            onLoadingChange={setIsPredicting}
                            onProgressChange={setVideoProgress}
                            exampleLabel={t("ui.randomVideo")}
                            exampleLoadingLabel={t("ui.loadingRandomVideo")}
                            randomClassLabel={t("ui.randomPersonVideo")}
                            randomClassMatched={Array.isArray(result) && result.some((frame) => frame?.poses?.length > 0)}
                            onExampleClick={() => getRandomVideoUrl(model, previewSearchTerms)}
                            mediaType="video"
                        />
                        {error ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
                    </div>
                </div>
                {videoSource ? (
                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        {renderFrameContent?.({
                            frame: currentFrame,
                            index: result?.indexOf(currentFrame) ?? -1,
                            frames: result,
                        })}
                        <PosePredictionResult
                            video={videoSource}
                            onVideoElement={(element) => {
                                videoRef.current = element;
                            }}
                            result={currentFrame?.poses ?? []}
                            countLabel={model.predictionLabel}
                            showResponse={false}
                            confidenceThreshold={confidenceThreshold}
                            onConfidenceThresholdChange={setConfidenceThreshold}
                            keypointLabels={model.keypoints}
                            showIds={showIds}
                            annotationSession={annotationSession}
                            trackingEnabled={angles ? true : tracking}
                            onShowIdsChange={setShowIds}
                            defaultSelectedKeypoints={defaultSelectedKeypoints}
                            defaultShowLabels={defaultShowLabels}
                            defaultShowConfidence={defaultShowConfidence}
                            counterMetrics={currentFrame?.poses
                                ?.filter((pose) => pose?.bicepCurlMetrics)
                                .map((pose) => ({ trackId: pose.track_id, ...pose.bicepCurlMetrics }))}
                            counterVisibility={counterVisibility}
                            onCounterVisibilityChange={onCounterVisibilityChange}
                            counterLabels={counterLabels}
                            counterPersonLabel={counterPersonLabel}
                        />
                    </div>
                ) : null}
                {result ? (
                    <VideoApiResponseCard
                        frames={result}
                        currentFrame={currentFrame}
                        videoRef={videoRef}
                        syncEnabled={syncEnabled}
                        onSyncChange={(event) => setSyncEnabled(event.target.checked)}
                        apiResponseLabel={t("ui.apiResponse")}
                        apiResponseTooltip={apiResponseTooltip}
                        syncLabel={t("ui.syncVideoFrame")}
                        onSelectFrame={selectFrame}
                    />
                ) : null}
            </div>
        </PredictionResultLayout>
    );
};
