import { useCallback, useEffect, useRef } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { drawIncidentAnnotations } from "../utils/createIncidentScreenshot.js";

const getFrameAtPlaybackTime = (frames, currentTime, duration) => {
    if (!frames.length) return null;
    const hasTimestamps = frames.some((frame) => frame?.timestamp_ms != null);
    if (hasTimestamps) {
        return frames.reduce((closest, frame) => (
            Math.abs(Number(frame?.timestamp_ms ?? 0) - currentTime * 1000)
                < Math.abs(Number(closest?.timestamp_ms ?? 0) - currentTime * 1000)
                ? frame
                : closest
        ), frames[0]);
    }
    const index = duration > 0
        ? Math.round((currentTime / duration) * (frames.length - 1))
        : 0;
    return frames[Math.min(Math.max(index, 0), frames.length - 1)];
};

export const KnifeAttackVideo = ({
    videoSource,
    frames,
    currentFrame,
    onCurrentFrameChange,
    videoRef,
    labels,
    onVideoError,
    annotationsEnabled,
    annotationOptions,
    isFullscreen,
    onToggleFullscreen,
}) => {
    const canvasRef = useRef(null);
    const currentFrameRef = useRef(currentFrame);

    useEffect(() => {
        currentFrameRef.current = currentFrame;
    }, [currentFrame]);

    const syncCurrentFrame = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        const nextFrame = getFrameAtPlaybackTime(frames, video.currentTime, video.duration);
        if (nextFrame && nextFrame !== currentFrameRef.current) {
            currentFrameRef.current = nextFrame;
            onCurrentFrameChange(nextFrame);
        }
    }, [frames, onCurrentFrameChange, videoRef]);

    const drawCurrentFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!video?.videoWidth || !video?.videoHeight || !canvas || !context) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (annotationsEnabled) {
            drawIncidentAnnotations(
                context,
                currentFrameRef.current,
                labels,
                canvas.width,
                annotationOptions,
            );
        }
    }, [annotationOptions, annotationsEnabled, labels, videoRef]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return undefined;
        video.addEventListener("loadedmetadata", drawCurrentFrame);
        drawCurrentFrame();
        return () => video.removeEventListener("loadedmetadata", drawCurrentFrame);
    }, [drawCurrentFrame, videoRef, videoSource]);

    useEffect(() => {
        currentFrameRef.current = currentFrame;
        drawCurrentFrame();
    }, [currentFrame, drawCurrentFrame]);

    return (
        <div className="overflow-hidden rounded-2xl bg-black">
            <div className="relative">
                <video
                    ref={videoRef}
                    src={videoSource}
                    crossOrigin="anonymous"
                    controls={!isFullscreen}
                    playsInline
                    onTimeUpdate={syncCurrentFrame}
                    onSeeked={syncCurrentFrame}
                    onError={onVideoError}
                    className="block h-auto w-full"
                    aria-label={labels.videoAlt}
                />
                <canvas
                    ref={canvasRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                />
                <button
                    type="button"
                    onClick={onToggleFullscreen}
                    className="absolute right-3 top-3 z-20 cursor-pointer rounded-lg bg-black/70 p-2 text-white hover:bg-black/90"
                    aria-label={isFullscreen ? labels.exitFullscreen : labels.enterFullscreen}
                    title={isFullscreen ? labels.exitFullscreen : labels.enterFullscreen}
                >
                    {isFullscreen
                        ? <Minimize2 className="h-5 w-5" aria-hidden="true" />
                        : <Maximize2 className="h-5 w-5" aria-hidden="true" />}
                </button>
            </div>
        </div>
    );
};
