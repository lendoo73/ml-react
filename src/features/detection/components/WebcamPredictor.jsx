import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";
import { ClassSelector } from "../../../components/ui/ClassSelector.jsx";
import { FixedSpinner } from "../../../components/ui/FixedSpinner.jsx";
import { PredictionResultLayout } from "../../../components/ui/PredictionResultLayout.jsx";
import { FullscreenMediaLayout } from "../../../components/ui/FullscreenMediaLayout.jsx";
import { ConfidenceThresholdControl } from "../../../components/ui/ConfidenceThresholdControl.jsx";
import { AnnotationSizeControl } from "../../../components/ui/AnnotationSizeControl.jsx";
import { Checkbox } from "../../../components/ui/Checkbox.jsx";
import { TrackingControls } from "../../../components/ui/TrackingControls.jsx";
import { drawAnnotationLabel } from "../../../components/ui/drawAnnotationLabel.js";
import { getAnnotationColor } from "../../../utils/getAnnotationColor.js";
import { getOrientedBoxLabelGeometry } from "../../obb/utils/getOrientedBoxLabelGeometry.js";
import { appendQueryParams } from "../../../utils/appendQueryParams.js";

const FRAME_INTERVAL_MS = 250;

const getWebcamStartupError = (error, t) => {
    const errorName = error?.name ?? "";
    const errorMessage = error?.message ?? "";
    if (["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(errorName)
        || /permission denied|camera permission|not allowed to access/i.test(errorMessage)) {
        return t("ui.webcamPermissionDenied");
    }
    if (errorName === "NotFoundError") return t("ui.webcamNoCamera");
    if (["AbortError", "NotReadableError"].includes(errorName)
        || /could not start video source/i.test(errorMessage)) {
        return t("ui.webcamDeviceBusy");
    }
    return errorMessage || t("ui.webcamAccessError");
};

const getWebSocketUrl = (endpointUrl) => {
    const url = new URL(endpointUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
};

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

export const WebcamPredictor = ({ model, isSegmentation = false, supportsTracking = true, onDetectionsChange, onTrackingChange, onTrackingSessionStart, drawCustomOverlay, renderSplitterOverlay, renderControlsPanel, onSplitterPointerMove, onSplitterPointerUp, onSplitterPointerCancel, defaultShowLabels = true, defaultShowConfidence = true }) => {
    const { t } = useLanguage();
    const isOrientedBoundingBox = model.supportsOrientedBoxes ?? model.id === "yolo26-obb-official";
    const videoRef = useRef(null);
    const overlayRef = useRef(null);
    const splitterOverlayRef = useRef(null);
    const captureRef = useRef(null);
    const socketRef = useRef(null);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const containerRef = useRef(null);
    const inferencePendingRef = useRef(false);
    const annotationSessionRef = useRef(0);
    const onDetectionsChangeRef = useRef(onDetectionsChange);
    onDetectionsChangeRef.current = onDetectionsChange;
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
    const [showOrientedBoxes, setShowOrientedBoxes] = useState(true);
    const [showLabels, setShowLabels] = useState(defaultShowLabels);
    const [showConfidence, setShowConfidence] = useState(defaultShowConfidence);
    const [tracking, setTracking] = useState(false);
    const [tracker, setTracker] = useState("bytetrack");
    const [showIds, setShowIds] = useState(true);
    const [showTrajectory, setShowTrajectory] = useState(false);
    const [trajectoryHistory, setTrajectoryHistory] = useState([]);

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
        Object.assign(splitterOverlayRef.current?.style ?? {}, {
            width: canvas.style.width,
            height: canvas.style.height,
            left: canvas.style.left,
            top: canvas.style.top,
        });
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        const labelFontSize = 16 * annotationSize;
        const labelHeight = 24 * annotationSize;
        context.lineWidth = 3 * annotationSize;
        context.font = `${labelFontSize}px system-ui, sans-serif`;

        if (tracking && showTrajectory) {
            const trails = new Map();
            detections
                .filter((detection) => detection.track_id != null
                    && selectedClasses.includes(detection.class_name)
                    && (detection.confidence ?? 0) >= confidenceThreshold
                    && Array.isArray(detection.trajectory)
                    && detection.trajectory.length > 1)
                .forEach((detection) => {
                    const key = `${detection.class_name}:${detection.track_id}`;
                    const points = detection.trajectory
                        .filter((point) => Array.isArray(point) && point.length >= 2)
                        .map(([x, y]) => [Number(x), Number(y)])
                        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
                    if (points.length > 1) trails.set(key, points);
                });
            trajectoryHistory.forEach(({ className, trackId, point }) => {
                const key = `${className}:${trackId}`;
                if (!trails.has(key)) trails.set(key, [...(trails.get(key) ?? []), point]);
            });
            trails.forEach((points, key) => {
                if (points.length < 2) return;
                const [className, trackId] = key.split(":");
                context.strokeStyle = getAnnotationColor(className, trackId, annotationSessionRef.current).color;
                context.lineWidth = 4 * annotationSize;
                context.lineCap = "round";
                context.lineJoin = "round";
                context.beginPath();
                points.forEach(([x, y], index) => index === 0
                    ? context.moveTo(x, y)
                    : context.lineTo(x, y));
                context.strokeStyle = "rgba(255, 255, 255, 0.9)";
                context.lineWidth = 7 * annotationSize;
                context.stroke();
                context.strokeStyle = getAnnotationColor(className, trackId, annotationSessionRef.current).color;
                context.lineWidth = 4 * annotationSize;
                context.stroke();
                const [lastX, lastY] = points[points.length - 1];
                context.fillStyle = context.strokeStyle;
                context.beginPath();
                context.arc(lastX, lastY, 4 * annotationSize, 0, Math.PI * 2);
                context.fill();
            });
        }

        if (!showBoxes) {
            drawCustomOverlay?.(context, detections);
            return;
        }
        detections
            .filter((detection) => selectedClasses.includes(detection.class_name))
            .forEach((detection) => {
            if ((detection.confidence ?? 0) < confidenceThreshold) return;
            const corners = detection.obb?.corners;
            if (Array.isArray(corners) && corners.length >= 3) {
                const labelGeometry = getOrientedBoxLabelGeometry(corners);
                const annotationColor = getAnnotationColor(detection.class_name, detection.track_id, annotationSessionRef.current).color;
                context.beginPath();
                corners.forEach(([x, y], index) => index === 0
                    ? context.moveTo(x, y)
                    : context.lineTo(x, y));
                context.closePath();
                if (showOrientedBoxes) {
                    context.strokeStyle = annotationColor;
                    context.stroke();
                }
                drawAnnotationLabel(context, {
                    x: labelGeometry?.x ?? Math.min(...corners.map(([x]) => x)),
                    y: labelGeometry
                        ? Math.max(0, labelGeometry.y - labelFontSize * 1.35)
                        : Math.max(0, Math.min(...corners.map(([, y]) => y)) - labelHeight),
                    centered: Boolean(labelGeometry),
                    rotation: labelGeometry?.angle ?? 0,
                    className: showLabels ? detection.class_name : "",
                    colorClassName: detection.class_name,
                    trackId: detection.track_id,
                    sessionKey: annotationSessionRef.current,
                    showTrackId: showIds,
                    confidence: showConfidence ? detection.confidence : null,
                    fontSize: labelFontSize,
                    padding: 6 * annotationSize,
                });
                return;
            }
            if (isSegmentation) {
                const polygon = detection.polygon ?? [];
                if (polygon.length < 2) return;
                const annotationColor = getAnnotationColor(detection.class_name, detection.track_id, annotationSessionRef.current).color;
                context.beginPath();
                polygon.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
                context.closePath();
                context.fillStyle = annotationColor;
                context.globalAlpha = 0.35;
                context.fill();
                context.globalAlpha = 1;
                if (showBoundaryBoxes) {
                    context.strokeStyle = annotationColor;
                    context.stroke();
                }
                const minX = Math.min(...polygon.map(([x]) => x));
                const minY = Math.min(...polygon.map(([, y]) => y));
                drawAnnotationLabel(context, {
                    x: minX,
                    y: Math.max(0, minY - (24 * annotationSize)),
                    className: showLabels ? detection.class_name : "",
                    colorClassName: detection.class_name,
                    trackId: detection.track_id,
                    sessionKey: annotationSessionRef.current,
                    showTrackId: showIds,
                    confidence: showConfidence ? detection.confidence : null,
                    fontSize: 16 * annotationSize,
                    padding: 6 * annotationSize,
                });
                return;
            }
            const { x_min, y_min, x_max, y_max } = detection.bbox ?? {};
            if (![x_min, y_min, x_max, y_max].every(Number.isFinite)) return;

            if (showBoundaryBoxes) {
                context.strokeStyle = getAnnotationColor(detection.class_name, detection.track_id, annotationSessionRef.current).color;
                context.strokeRect(x_min, y_min, x_max - x_min, y_max - y_min);
            }
            drawAnnotationLabel(context, {
                x: x_min,
                y: Math.max(0, y_min - labelHeight),
                className: showLabels ? detection.class_name : "",
                colorClassName: detection.class_name,
                trackId: detection.track_id,
                sessionKey: annotationSessionRef.current,
                showTrackId: showIds,
                confidence: showConfidence ? detection.confidence : null,
                fontSize: labelFontSize,
                padding: 6 * annotationSize,
            });
            });
        drawCustomOverlay?.(context, detections);
    }, [detections, selectedClasses, showBoxes, isSegmentation, confidenceThreshold, annotationSize, showBoundaryBoxes, showOrientedBoxes, showLabels, showConfidence, showIds, tracking, showTrajectory, trajectoryHistory, drawCustomOverlay]);

    const stopWebcam = () => {
        setIsTransitioning(true);
        clearInterval(timerRef.current);
        timerRef.current = null;
        inferencePendingRef.current = false;
        const socket = socketRef.current;
        socketRef.current = null;
        socket?.close();
        setDetections([]);
        onDetectionsChangeRef.current?.([], { width: 0, height: 0 });
        setTrajectoryHistory([]);
        setKnownClasses([]);
        setSelectedClasses([]);
        const stream = streamRef.current ?? videoRef.current?.srcObject;
        stream?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsRunning(false);
        window.setTimeout(() => setIsTransitioning(false), 300);
    }

    const startWebcam = async () => {
        setIsTransitioning(true);
        setError("");
        inferencePendingRef.current = false;
        annotationSessionRef.current += 1;
        let stream;
        let socket;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            streamRef.current = stream;
            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            const domain = model.apiPath ?? (isSegmentation ? "segmentation" : "object_detection");
            const endpointUrl = `${API_URL}/api/${domain}/predict/webcam`;
            const socketUrl = new URL(getWebSocketUrl(endpointUrl));
            socketUrl.searchParams.set("model", model.apiModel ?? (isSegmentation ? "yolo26x-seg" : "yolo26x"));
            if (supportsTracking) {
                socketUrl.searchParams.set("tracking", String(tracking));
                socketUrl.searchParams.set("tracker", tracker);
            }
            appendQueryParams(socketUrl.searchParams, model.queryParams);
            onTrackingSessionStart?.();
            socket = new WebSocket(socketUrl);
            socketRef.current = socket;
            socket.binaryType = "arraybuffer";
            socket.onmessage = (event) => {
                inferencePendingRef.current = false;
                const nextDetections = JSON.parse(event.data);
                onDetectionsChangeRef.current?.(nextDetections, {
                    width: videoRef.current?.videoWidth ?? 0,
                    height: videoRef.current?.videoHeight ?? 0,
                }, tracking);
                if (tracking) {
                    const activeTrackIds = new Set(nextDetections
                        .filter((detection) => detection.track_id != null)
                        .map((detection) => `${detection.class_name}:${detection.track_id}`));
                    setTrajectoryHistory((history) => [
                        ...history.filter(({ className, trackId }) => activeTrackIds.has(`${className}:${trackId}`)),
                        ...nextDetections.flatMap((detection) => {
                            const point = detection.track_id == null ? null : getDetectionCenter(detection);
                            return point ? [{
                                className: detection.class_name,
                                trackId: detection.track_id,
                                point,
                            }] : [];
                        }),
                    ].slice(-500));
                }
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
            socket?.close();
            stream?.getTracks().forEach((track) => track.stop());
            if (socketRef.current === socket) socketRef.current = null;
            if (streamRef.current === stream) streamRef.current = null;
            if (videoRef.current?.srcObject === stream) videoRef.current.srcObject = null;
            setError(getWebcamStartupError(startError, t));
            stopWebcam();
        } finally {
            setIsTransitioning(false);
        }
    };

    useEffect(() => {
        drawDetections();
    }, [drawDetections]);

    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;
        if (!video || !container) return undefined;

        const redraw = () => requestAnimationFrame(drawDetections);
        const resizeObserver = new ResizeObserver(redraw);
        resizeObserver.observe(video);
        resizeObserver.observe(container);
        video.addEventListener("loadedmetadata", redraw);
        window.addEventListener("resize", redraw);

        return () => {
            resizeObserver.disconnect();
            video.removeEventListener("loadedmetadata", redraw);
            window.removeEventListener("resize", redraw);
        };
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
        >
            <FullscreenMediaLayout
                containerRef={containerRef}
                isFullscreen={isFullscreen}
                className="lg:grid-cols-[minmax(0,1fr)_22rem]"
                media={(
                    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-black">
                        <video ref={videoRef} className={`block ${isFullscreen ? "h-full w-full object-contain" : "w-full"}`} autoPlay muted playsInline />
                        <canvas ref={overlayRef} className="pointer-events-none absolute left-0 top-0" />
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
                                style={{ pointerEvents: "none" }}
                                aria-label={model.counter?.splitterAriaLabel}
                                onPointerMove={onSplitterPointerMove}
                                onPointerUp={onSplitterPointerUp}
                                onPointerCancel={onSplitterPointerCancel}
                            >
                                {renderSplitterOverlay(detections, {
                                    width: videoRef.current?.videoWidth ?? 0,
                                    height: videoRef.current?.videoHeight ?? 0,
                                })}
                            </svg>
                        ) : null}
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
                    {renderControlsPanel?.(detections, {
                        width: videoRef.current?.videoWidth ?? 0,
                        height: videoRef.current?.videoHeight ?? 0,
                    })}
                    <ConfidenceThresholdControl value={confidenceThreshold} onChange={setConfidenceThreshold} />
                    {supportsTracking ? (
                        <TrackingControls
                            tracking={tracking}
                            onTrackingChange={(nextTracking) => {
                                setTracking(nextTracking);
                                onTrackingChange?.(nextTracking);
                            }}
                            tracker={tracker}
                            onTrackerChange={setTracker}
                            disabled={isRunning || isTransitioning}
                        />
                    ) : null}
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
                        {isOrientedBoundingBox ? (
                            <Checkbox checked={showOrientedBoxes} onChange={(event) => setShowOrientedBoxes(event.target.checked)} className="mb-2 text-xs"><span>{t("image.orientedBoxes")}</span></Checkbox>
                        ) : (
                            <Checkbox checked={showBoundaryBoxes} onChange={(event) => setShowBoundaryBoxes(event.target.checked)} className="mb-2 text-xs"><span>{t("image.boundaryBoxes")}</span></Checkbox>
                        )}
                        <Checkbox checked={showConfidence} onChange={(event) => setShowConfidence(event.target.checked)} className="mb-2 text-xs"><span>{t("image.confidence")}</span></Checkbox>
                        <Checkbox checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} className="text-xs"><span>{t("image.labels")}</span></Checkbox>
                        {tracking ? <Checkbox checked={showIds} onChange={(event) => setShowIds(event.target.checked)} className="mt-2 text-xs"><span>{t("ui.objectIds")}</span></Checkbox> : null}
                        {tracking ? <Checkbox checked={showTrajectory} onChange={(event) => setShowTrajectory(event.target.checked)} className="mt-2 text-xs"><span>{t("ui.trajectory")}</span></Checkbox> : null}
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
        </PredictionResultLayout>
    );
};
