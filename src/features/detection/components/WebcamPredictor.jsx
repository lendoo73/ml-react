import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";
import { ClassSelector } from "../../../components/ui/ClassSelector.jsx";
import { FixedSpinner } from "../../../components/ui/FixedSpinner.jsx";
import { PredictionResultLayout } from "../../../components/ui/PredictionResultLayout.jsx";
import { ConfidenceThresholdControl } from "../../../components/ui/ConfidenceThresholdControl.jsx";
import { AnnotationSizeControl } from "../../../components/ui/AnnotationSizeControl.jsx";
import { Checkbox } from "../../../components/ui/Checkbox.jsx";

const FRAME_INTERVAL_MS = 250;

const getWebSocketUrl = (apiPath, endpoint) => {
    const url = new URL(`${API_URL}/api/${apiPath}/${endpoint}`);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
};

export const WebcamPredictor = ({ model, isSegmentation = false }) => {
    const { t } = useLanguage();
    const videoRef = useRef(null);
    const overlayRef = useRef(null);
    const captureRef = useRef(null);
    const socketRef = useRef(null);
    const timerRef = useRef(null);
    const containerRef = useRef(null);
    const inferencePendingRef = useRef(false);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState("");
    const [detections, setDetections] = useState([]);
    const [knownClasses, setKnownClasses] = useState([]);
    const [showBoxes, setShowBoxes] = useState(true);
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [annotationSize, setAnnotationSize] = useState(1);
    const [showBoundaryBoxes, setShowBoundaryBoxes] = useState(!isSegmentation);
    const [showLabels, setShowLabels] = useState(true);
    const [showConfidence, setShowConfidence] = useState(true);

    const classes = knownClasses;
    const classCounts = useMemo(() => detections.reduce((counts, detection) => {
        if (detection.class_name) counts[detection.class_name] = (counts[detection.class_name] ?? 0) + 1;
        return counts;
    }, {}), [detections]);

    const drawDetections = useCallback(() => {
        const video = videoRef.current;
        const canvas = overlayRef.current;
        if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const videoRatio = video.videoWidth / video.videoHeight;
        const containerWidth = video.clientWidth;
        const containerHeight = video.clientHeight;
        const containerRatio = containerWidth / containerHeight;
        const displayWidth = containerRatio > videoRatio ? containerHeight * videoRatio : containerWidth;
        const displayHeight = containerRatio > videoRatio ? containerHeight : containerWidth / videoRatio;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        canvas.style.left = `${(containerWidth - displayWidth) / 2}px`;
        canvas.style.top = `${(containerHeight - displayHeight) / 2}px`;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        const labelFontSize = 16 * annotationSize;
        const labelHeight = 24 * annotationSize;
        context.lineWidth = 3 * annotationSize;
        context.font = `${labelFontSize}px system-ui, sans-serif`;

        if (!showBoxes) return;
        detections
            .filter((detection) => selectedClasses.includes(detection.class_name))
            .forEach((detection) => {
            if ((detection.confidence ?? 0) < confidenceThreshold) return;
            if (isSegmentation) {
                const polygon = detection.polygon ?? [];
                if (polygon.length < 2) return;
                context.beginPath();
                polygon.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
                context.closePath();
                context.fillStyle = "rgba(34, 197, 94, 0.35)";
                context.fill();
                if (showBoundaryBoxes) {
                    context.strokeStyle = "#22c55e";
                    context.stroke();
                }
                if (showLabels || showConfidence) {
                    context.fillStyle = "#fff";
                    context.fillText(`${showLabels ? detection.class_name : ""}${showLabels && showConfidence ? " " : ""}${showConfidence ? `${(detection.confidence * 100).toFixed(1)}%` : ""}`, polygon[0][0], polygon[0][1]);
                }
                return;
            }
            const { x_min, y_min, x_max, y_max } = detection.bbox ?? {};
            if (![x_min, y_min, x_max, y_max].every(Number.isFinite)) return;

            if (showBoundaryBoxes) {
                context.strokeStyle = "#ef4444";
                context.strokeRect(x_min, y_min, x_max - x_min, y_max - y_min);
            }
            const displayLabel = `${showLabels ? detection.class_name : ""}${showLabels && showConfidence ? " " : ""}${showConfidence ? `${(detection.confidence * 100).toFixed(1)}%` : ""}`;
            if (displayLabel) {
                context.fillStyle = "#ef4444";
                context.fillRect(x_min, Math.max(0, y_min - labelHeight), context.measureText(displayLabel).width + (8 * annotationSize), labelHeight);
                context.fillStyle = "#fff";
                context.fillText(displayLabel, x_min + (4 * annotationSize), Math.max(labelFontSize, y_min - (7 * annotationSize)));
            }
            });
    }, [detections, selectedClasses, showBoxes, isSegmentation, confidenceThreshold, annotationSize, showBoundaryBoxes, showLabels, showConfidence]);

    const stopWebcam = () => {
        setIsTransitioning(true);
        clearInterval(timerRef.current);
        timerRef.current = null;
        inferencePendingRef.current = false;
        socketRef.current?.close();
        socketRef.current = null;
        setDetections([]);
        setKnownClasses([]);
        setSelectedClasses([]);
        videoRef.current?.srcObject?.getTracks().forEach((track) => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsRunning(false);
        window.setTimeout(() => setIsTransitioning(false), 300);
    }

    const startWebcam = async () => {
        setIsTransitioning(true);
        setError("");
        inferencePendingRef.current = false;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const socket = new WebSocket(getWebSocketUrl(model.apiPath, model.endpoints.webcam));
            socket.binaryType = "arraybuffer";
            socket.onmessage = (event) => {
                inferencePendingRef.current = false;
                const nextDetections = JSON.parse(event.data);
                const detectedClasses = nextDetections.map((detection) => detection.class_name).filter(Boolean);
                setDetections(nextDetections);
                setKnownClasses((currentClasses) => {
                    const newClasses = detectedClasses.filter((className) => !currentClasses.includes(className));
                    if (newClasses.length > 0) {
                        setSelectedClasses((selected) => [...new Set([...selected, ...newClasses])]);
                    }
                    return [...new Set([...currentClasses, ...detectedClasses])];
                });
            };
            socket.onerror = () => setError(t("ui.webcamConnectionError"));
            socket.onclose = () => {
                inferencePendingRef.current = false;
                stopWebcam();
            };

            await new Promise((resolve, reject) => {
                socket.onopen = resolve;
                socket.onerror = () => reject(new Error(t("ui.webcamConnectionError")));
            });

            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            socketRef.current = socket;
            setIsRunning(true);

            const capture = captureRef.current;
            timerRef.current = setInterval(() => {
                const video = videoRef.current;
                if (
                    inferencePendingRef.current
                    || !video
                    || video.readyState < 2
                    || socket.readyState !== WebSocket.OPEN
                ) return;
                inferencePendingRef.current = true;
                capture.width = video.videoWidth;
                capture.height = video.videoHeight;
                capture.getContext("2d").drawImage(video, 0, 0);
                capture.toBlob((blob) => {
                    if (!blob || socket.readyState !== WebSocket.OPEN) {
                        inferencePendingRef.current = false;
                        return;
                    }
                    socket.send(blob);
                }, "image/jpeg", 0.75);
            }, FRAME_INTERVAL_MS);
        } catch (startError) {
            setError(startError.message || t("ui.webcamAccessError"));
            stopWebcam();
        } finally {
            setIsTransitioning(false);
        }
    };

    useEffect(() => {
        drawDetections();
    }, [drawDetections]);

    useEffect(() => () => stopWebcam(), []);

    const toggleFullscreen = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await containerRef.current?.requestFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    return (
        <PredictionResultLayout
            overlay={<FixedSpinner loading={isTransitioning} message={isRunning ? "Stopping webcam..." : "Starting webcam..."} />}
            media={(
                <div ref={containerRef} className={`relative overflow-hidden rounded-xl bg-black ${isFullscreen ? "flex h-screen w-screen items-center justify-center" : ""}`}>
                    <video ref={videoRef} className={`block ${isFullscreen ? "h-screen w-screen object-contain" : "w-full"}`} autoPlay muted playsInline />
                    <canvas ref={overlayRef} className="pointer-events-none absolute left-0 top-0" />
                    <canvas ref={captureRef} className="hidden" />
                </div>
            )}
            controls={(
                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3">
                        <button type="button" onClick={toggleFullscreen} className="rounded-lg bg-blue-600 p-2 text-white" aria-label={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}>
                            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                        </button>
                        <button type="button" onClick={() => setShowBoxes((visible) => !visible)} className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white">
                            {showBoxes ? t("ui.hideBoxes") : t("ui.showBoxes")}
                        </button>
                    </div>
                    <ConfidenceThresholdControl value={confidenceThreshold} onChange={setConfidenceThreshold} />
                    {classes.length > 0 ? (
                        <ClassSelector
                            inline
                            classes={classes}
                            selectedClasses={selectedClasses}
                            counts={classCounts}
                            onSelectAll={() => setSelectedClasses(classes)}
                            onClearAll={() => setSelectedClasses([])}
                            onToggle={(className) => setSelectedClasses((current) => current.includes(className)
                                ? current.filter((item) => item !== className)
                                : [...current, className])}
                        />
                    ) : null}
                    <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-gray-100">
                        <p className="mb-2 border-b border-gray-700 pb-2 text-center text-sm font-semibold">{t("image.annotationOptions")}</p>
                        <Checkbox checked={showBoundaryBoxes} onChange={(event) => setShowBoundaryBoxes(event.target.checked)} className="mb-2 text-xs"><span>{t("image.boundaryBoxes")}</span></Checkbox>
                        <Checkbox checked={showConfidence} onChange={(event) => setShowConfidence(event.target.checked)} className="mb-2 text-xs"><span>{t("image.confidence")}</span></Checkbox>
                        <Checkbox checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} className="text-xs"><span>{t("image.labels")}</span></Checkbox>
                        <AnnotationSizeControl value={annotationSize} onChange={setAnnotationSize} />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={isRunning ? stopWebcam : startWebcam}
                            disabled={isTransitioning}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                        >
                            {isRunning ? t("ui.webcamStop") : t("ui.webcamStart")}
                        </button>
                        {error ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
                    </div>
                </div>
            )}
        />
    );
};
