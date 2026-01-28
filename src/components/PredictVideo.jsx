
import { useEffect, useMemo, useRef, useState } from "react";
import { SubHeader } from "./SubHeader.jsx";
import { VideoUploader } from "./ui/VideoUploader.jsx";
import { useLanguage } from "../context/useLanguage.js";
import {API_URL} from "../config/settings.js";

const makeTimestampIndex = frames => {
    if (!Array.isArray(frames)) return () => null;
    const ts = frames.map(f => f?.timestamp_ms ?? 0);
    return (ms) => {
        if (ts.length === 0) return null;

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

export const PredictVideo = () => {
    const { t } = useLanguage();

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [videoFile, setVideoFile] = useState(null);  // <-- parent controls file
    const [videoUrl, setVideoUrl] = useState("");
    const [predictions, setPredictions] = useState(null);

    const getFrameByTime = useMemo(() => makeTimestampIndex(predictions), [predictions]);

    // CHANGED: renamed from handleVideoSelect; same logic
    const handleVideoChange = (file) => {
        setPredictions(null);
        setVideoFile(file);
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        if (file) setVideoUrl(URL.createObjectURL(file));
        else setVideoUrl("");
    };

    const handleVideoResult = (result) => {
        setPredictions(Array.isArray(result) ? result : null);
    };

    useEffect(() => {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c) return;

        const syncSize = () => {
            const w = v.videoWidth || v.clientWidth;
            const h = v.videoHeight || v.clientHeight;
            if (w && h) {
                c.width = w;
                c.height = h;
                c.style.width = `${w}px`;
                c.style.height = `${h}px`;
            }
        };

        v.addEventListener("loadedmetadata", syncSize);
        window.addEventListener("resize", syncSize);
        syncSize();

        return () => {
            v.removeEventListener("loadedmetadata", syncSize);
            window.removeEventListener("resize", syncSize);
        };
    }, [videoUrl]);

    useEffect(() => {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c) return;
        const ctx = c.getContext("2d");

        let rafId;

        const draw = () => {
            ctx.clearRect(0, 0, c.width, c.height);

            if (predictions && !isNaN(v.currentTime)) {
                const ms = Math.floor(v.currentTime * 1000);
                const frame = getFrameByTime(ms);
                const detections = frame?.detections ?? [];

                ctx.save();
                ctx.lineWidth = 2;
                ctx.font = "14px system-ui, sans-serif";

                let personCount = 0;

                detections.forEach(det => {
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

                    if ((det.class_name || "").toLowerCase() === "person") {
                        personCount += 1;
                    }
                });

                if (detections.length > 0) {
                    const text = `Persons: ${personCount}`;
                    const pad = 8;
                    const x1 = 6, y1 = 6;
                    ctx.font = "18px system-ui, sans-serif";
                    const tw = ctx.measureText(text).width;
                    const th = 18;
                    ctx.fillStyle = "rgba(0,0,0,0.35)";
                    ctx.fillRect(x1, y1, tw + 2 * pad, th + 2 * pad);
                    ctx.fillStyle = "rgb(255, 255, 0)";
                    ctx.fillText(text, x1 + pad, y1 + th + (pad - 2));
                }

                ctx.restore();
            }

            rafId = requestAnimationFrame(draw);
        };

        rafId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafId);
    }, [predictions, getFrameByTime]);

    return (
        <>
            <SubHeader content={t("models.0.mode.video.subheader")} />

            <VideoUploader
                label={t("models.0.mode.video.uploadLabel")}
                buttonText={t("models.0.mode.video.chooseVideo")}
                accept="video/mp4,video/webm,video/ogg"
                endpoint={`${API_URL}/api/passenger_counter/predict/video`}
                // CHANGED: controlled props instead of onFileSelect
                video={videoFile}
                onVideoChange={handleVideoChange}
                onResult={handleVideoResult}
                ariaLabel="Choose video file"
            />

            {videoUrl && (
                <div className="relative mt-4" style={{ width: "min(100%, 960px)" }}>
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        playsInline
                        className="w-full h-auto rounded-md"
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
                    <canvas ref={canvasRef} />
                </div>
            )}
        </>
    );
};
