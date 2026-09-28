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

export const PoseVideo = ({ model, onChange, onPredictionStart }) => {
    const { t } = useLanguage();
    const [videoFile, setVideoFile] = useState(null);
    const [fileVideoUrl, setFileVideoUrl] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [result, setResult] = useState(null);
    const [currentFrame, setCurrentFrame] = useState(null);
    const [syncEnabled, setSyncEnabled] = useState(false);
    const [isPredicting, setIsPredicting] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const videoRef = useRef(null);
    const fileVideoUrlRef = useRef("");
    const endpointBase = `${API_URL}/api/${model.apiPath}`;
    const fileEndpoint = `${endpointBase}/${model.endpoints.video}`;
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

    const handleResult = (nextResult, source) => {
        const frames = Array.isArray(nextResult) ? nextResult : [];
        setResult(frames);
        setCurrentFrame(frames[0] ?? null);
        setConfidenceThreshold(0.5);
        onChange?.(frames, source ?? (videoFile ?? videoUrl));
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
                    <div className="flex w-full flex-col items-center gap-4">
                        <VideoUploader
                            label={model?.mode?.video?.uploadLabel}
                            buttonText={model?.mode?.video?.chooseVideo}
                            endpoint={fileEndpoint}
                            fieldName={model?.videoFieldName ?? "source"}
                            video={videoFile}
                            onVideoChange={(nextFile) => {
                                handleVideoFileChange(nextFile);
                                if (nextFile) setVideoUrl("");
                                setResult(null);
                                setCurrentFrame(null);
                                onPredictionStart?.();
                            }}
                            onResult={(nextResult) => handleResult(nextResult, videoFile)}
                            onLoadingChange={setIsPredicting}
                            onProgressChange={setVideoProgress}
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
                            queryParamName={model?.videoUrlInput?.queryParamName ?? "source"}
                            queryParams={model?.urlQueryParams ?? {}}
                            inputId={`${model?.id ?? "model"}-video-url`}
                            onResult={(nextResult, sourceUrl) => handleResult(nextResult, sourceUrl ?? videoUrl)}
                            onPredictionStart={onPredictionStart}
                            onLoadingChange={setIsPredicting}
                            onProgressChange={setVideoProgress}
                            exampleLabel={t("ui.randomVideo")}
                            exampleLoadingLabel={t("ui.loadingRandomVideo")}
                            randomClassLabel={t("ui.randomPersonVideo")}
                            randomClassMatched={Array.isArray(result) && result.some((frame) => frame?.poses?.length > 0)}
                            onExampleClick={() => getRandomVideoUrl(model)}
                            mediaType="video"
                        />
                    </div>
                </div>
                {videoSource ? (
                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
                        />
                    </div>
                ) : null}
                {result ? (
                    <VideoApiResponseCard
                        frames={result}
                        currentFrame={currentFrame}
                        syncEnabled={syncEnabled}
                        onSyncChange={(event) => setSyncEnabled(event.target.checked)}
                        apiResponseLabel={t("ui.apiResponse")}
                        syncLabel={t("ui.syncVideoFrame")}
                        onSelectFrame={selectFrame}
                    />
                ) : null}
            </div>
        </PredictionResultLayout>
    );
};
