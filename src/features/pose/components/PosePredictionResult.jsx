import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { ApiResponseCard } from "../../../components/ui/ApiResponseCard.jsx";
import { Checkbox } from "../../../components/ui/Checkbox.jsx";
import { useLanguage } from "../../../context/useLanguage.js";
import { ConfidenceThresholdControl } from "../../../components/ui/ConfidenceThresholdControl.jsx";
import { AnnotationSizeControl } from "../../../components/ui/AnnotationSizeControl.jsx";
import { FullscreenPanelToggle } from "../../../components/ui/FullscreenMediaLayout.jsx";
import { getAnnotationColor } from "../../../utils/getAnnotationColor.js";

const POSE_KEYPOINT_LABELS = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
];

const POSE_SKELETON_PAIRS = [
    [0, 1], [0, 2], [1, 3], [2, 4],
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
];

const asPoint = (keypoint) => {
    if (!Array.isArray(keypoint)) return null;
    const x = Number(keypoint[0]);
    const y = Number(keypoint[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
};

const getElbowAngleArc = (shoulder, elbow, wrist, radius, labelOffset) => {
    const startAngle = Math.atan2(shoulder.y - elbow.y, shoulder.x - elbow.x);
    const endAngle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
    const delta = ((endAngle - startAngle + Math.PI) % (Math.PI * 2) + Math.PI * 2)
        % (Math.PI * 2) - Math.PI;
    const endPoint = {
        x: elbow.x + Math.cos(endAngle) * radius,
        y: elbow.y + Math.sin(endAngle) * radius,
    };
    const startPoint = {
        x: elbow.x + Math.cos(startAngle) * radius,
        y: elbow.y + Math.sin(startAngle) * radius,
    };

    return {
        path: `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 0 ${delta >= 0 ? 1 : 0} ${endPoint.x} ${endPoint.y}`,
        startPoint,
        endPoint,
        labelPoint: {
            x: elbow.x + Math.cos(startAngle + delta / 2) * labelOffset,
            y: elbow.y + Math.sin(startAngle + delta / 2) * labelOffset,
        },
    };
};

const getPoseLabel = (pose, showLabels, showConfidence, showIds) => {
    const confidence = Number(pose?.confidence);
    return {
        className: showLabels ? pose?.class_name ?? "" : "",
        id: showIds && pose?.track_id != null ? `ID ${pose.track_id}` : "",
        confidence: showConfidence && Number.isFinite(confidence)
            ? `${(confidence * 100).toFixed(1)}%`
            : "",
    };
};

const getPoseLabelAnchor = (pose) => {
    const bbox = pose?.bbox;
    if (bbox && Number.isFinite(bbox.x_min) && Number.isFinite(bbox.y_min)) {
        return { x: bbox.x_min, y: bbox.y_min };
    }

    const points = (Array.isArray(pose?.keypoints) ? pose.keypoints : [])
        .map(asPoint)
        .filter(Boolean);
    if (points.length === 0) return null;
    return {
        x: Math.min(...points.map(({ x }) => x)),
        y: Math.min(...points.map(({ y }) => y)),
    };
};

const renderPose = (
    pose,
    index,
    width,
    selectedKeypoints,
    showKeypoints,
    showSkeletons,
    showLabels,
    showConfidence,
    showIds,
    annotationSession,
    annotationSize = 1,
    counterData,
    showCounter,
    showAngle,
    metricsOnly = false
) => {
    const keypoints = Array.isArray(pose?.keypoints) ? pose.keypoints : [];
    const colors = getAnnotationColor(pose?.class_name, pose?.track_id, annotationSession);
    const color = colors.color;
    const { className, id, confidence } = getPoseLabel(pose, showLabels, showConfidence, showIds);
    const labelAnchor = getPoseLabelAnchor(pose);
    const fontSize = Math.max(14, width / 60) * annotationSize;
    const metrics = counterData?.trackId === pose?.track_id ? counterData : null;
    const labelHeight = fontSize * 1.7;
    const padding = fontSize * 0.5;
    const gap = fontSize * 0.4;
    const idPadding = fontSize * 0.35;
    const classWidth = className.length * fontSize * 0.62;
    const idWidth = id ? id.length * fontSize * 0.62 + idPadding * 2 : 0;
    const confidenceWidth = confidence.length * fontSize * 0.62;
    const labelWidth = classWidth + idWidth + confidenceWidth
        + (className && id ? gap : 0)
        + (confidence && (className || id) ? gap : 0)
        + padding * 2;
    const labelX = labelAnchor ? Math.max(0, Math.min(labelAnchor.x, width - labelWidth)) : 0;
    const labelY = labelAnchor ? Math.max(labelHeight, labelAnchor.y) : 0;

    return (
        <g key={`pose-${index}`}>
            {!metricsOnly && showSkeletons && POSE_SKELETON_PAIRS.map(([startIndex, endIndex], pairIndex) => {
                if (!selectedKeypoints.includes(startIndex) || !selectedKeypoints.includes(endIndex)) return null;
                const start = asPoint(keypoints[startIndex]);
                const end = asPoint(keypoints[endIndex]);
                if (!start || !end) return null;
                return (
                    <line
                        key={`pair-${index}-${pairIndex}`}
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        stroke={color}
                        strokeWidth={Math.max(2, width / 220) * annotationSize}
                        strokeLinecap="round"
                    />
                );
            })}
            {!metricsOnly && showKeypoints && keypoints.map((keypoint, keypointIndex) => {
                if (!selectedKeypoints.includes(keypointIndex)) return null;
                const point = asPoint(keypoint);
                if (!point) return null;
                const label = POSE_KEYPOINT_LABELS[keypointIndex] ?? `k${keypointIndex}`;
                return (
                    <g key={`point-${index}-${keypointIndex}`}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r={Math.max(3, width / 180) * annotationSize}
                            fill={color}
                            stroke="#ffffff"
                            strokeWidth={1.5 * annotationSize}
                        />
                        <title>{label}</title>
                    </g>
                );
            })}
            {!metricsOnly && (className || id || confidence) && labelAnchor ? (
                <g>
                    <rect
                        x={labelX}
                        y={labelY - labelHeight}
                        width={labelWidth}
                        height={labelHeight}
                        rx={fontSize * 0.25}
                        fill={color}
                    />
                    {className ? (
                        <text x={labelX + padding} y={labelY - fontSize * 0.42} fill={colors.textColor} fontSize={fontSize} fontWeight="600">
                            {className}
                        </text>
                    ) : null}
                    {id ? (
                        <g>
                            <rect
                                x={labelX + padding + classWidth + (className ? gap : 0)}
                                y={labelY - labelHeight + fontSize * 0.16}
                                width={idWidth}
                                height={labelHeight - fontSize * 0.32}
                                rx={fontSize * 0.18}
                                fill={colors.badgeColor}
                            />
                            <text
                                x={labelX + padding + classWidth + (className ? gap : 0) + idPadding}
                                y={labelY - fontSize * 0.42}
                                fill={colors.badgeTextColor}
                                fontSize={fontSize * 0.9}
                                fontWeight="700"
                            >
                                {id}
                            </text>
                        </g>
                    ) : null}
                    {confidence ? (
                        <text
                            x={labelX + labelWidth - padding}
                            y={labelY - fontSize * 0.42}
                            fill={colors.textColor}
                            fontSize={fontSize}
                            fontWeight="700"
                            textAnchor="end"
                        >
                            {confidence}
                        </text>
                    ) : null}
                </g>
            ) : null}
            {metrics && (
                [7, 8].map((keypointIndex) => {
                    const armIndex = keypointIndex === 7 ? 0 : 1;
                    const point = asPoint(keypoints[keypointIndex]);
                    const shoulder = asPoint(keypoints[keypointIndex === 7 ? 5 : 6]);
                    const wrist = asPoint(keypoints[keypointIndex === 7 ? 9 : 10]);
                    if (!point || (!showCounter && !showAngle)) return null;
                    const angle = metrics.angles[armIndex];
                    const radius = Math.max(14, width / 55) * annotationSize;
                    const angleArc = showAngle && angle != null && shoulder && wrist
                        ? getElbowAngleArc(shoulder, point, wrist, radius, radius + fontSize * 1.8)
                        : null;
                    const badgeRadius = fontSize * 0.78;
                    const shoulderToElbow = shoulder
                        ? { x: point.x - shoulder.x, y: point.y - shoulder.y }
                        : null;
                    const shoulderLength = shoulderToElbow
                        ? Math.hypot(shoulderToElbow.x, shoulderToElbow.y)
                        : 0;
                    const badgeCenter = shoulder && shoulderLength > 0
                        ? {
                            x: shoulder.x - (shoulderToElbow.x / shoulderLength) * fontSize * 1.5,
                            y: shoulder.y - (shoulderToElbow.y / shoulderLength) * fontSize * 1.5,
                        }
                        : { x: point.x, y: point.y - fontSize * 1.8 };
                    return (
                        <g key={`curl-metric-${index}-${keypointIndex}`}>
                            {showCounter ? (
                                <g>
                                    <circle
                                        cx={badgeCenter.x}
                                        cy={badgeCenter.y}
                                        r={badgeRadius}
                                        fill="#1d4ed8"
                                        stroke="#ffffff"
                                        strokeWidth={2 * annotationSize}
                                    />
                                    <text
                                        x={badgeCenter.x}
                                        y={badgeCenter.y + fontSize * 0.3}
                                        fill="#ffffff"
                                        fontSize={fontSize * 0.85}
                                        fontWeight="700"
                                        textAnchor="middle"
                                    >
                                        {metrics.counts[armIndex]}
                                    </text>
                                </g>
                            ) : null}
                            {angleArc ? (
                                <g>
                                    <line
                                        x1={point.x}
                                        y1={point.y}
                                        x2={angleArc.startPoint.x}
                                        y2={angleArc.startPoint.y}
                                        stroke="#facc15"
                                        strokeWidth={Math.max(3, width / 260) * annotationSize}
                                    />
                                    <line
                                        x1={point.x}
                                        y1={point.y}
                                        x2={angleArc.endPoint.x}
                                        y2={angleArc.endPoint.y}
                                        stroke="#facc15"
                                        strokeWidth={Math.max(3, width / 260) * annotationSize}
                                    />
                                    <path
                                        d={angleArc.path}
                                        fill="none"
                                        stroke="#facc15"
                                        strokeWidth={Math.max(5, width / 180) * annotationSize}
                                        strokeLinecap="round"
                                    />
                                    <rect
                                        x={angleArc.labelPoint.x - fontSize * 1.75}
                                        y={angleArc.labelPoint.y - fontSize * 0.72}
                                        width={fontSize * 3.5}
                                        height={fontSize * 1.45}
                                        rx={fontSize * 0.3}
                                        fill="#111827"
                                        fillOpacity="0.95"
                                        stroke="#facc15"
                                        strokeWidth={Math.max(1.5, width / 500) * annotationSize}
                                    />
                                    <text
                                        x={angleArc.labelPoint.x}
                                        y={angleArc.labelPoint.y + fontSize * 0.33}
                                        fill="#ffffff"
                                        fontSize={fontSize}
                                        fontWeight="700"
                                        textAnchor="middle"
                                    >
                                        {angle.toFixed(1)}°
                                    </text>
                                </g>
                            ) : null}
                        </g>
                    );
                })
            )}
        </g>
    );
};

export const PosePredictionResult = ({
    image,
    imageLink,
    video,
    videoStream,
    onVideoElement,
    extraControls,
    bottomControls,
    result,
    countLabel = "Detected poses",
    onImageLoad,
    showSummary = true,
    showToggle = true,
    showResponse = true,
    keypointLabels = POSE_KEYPOINT_LABELS,
    defaultSelectedKeypoints = POSE_KEYPOINT_LABELS,
    defaultShowLabels = true,
    defaultShowConfidence = true,
    showLabel,
    hideLabel,
    alt,
    confidenceThreshold,
    onConfidenceThresholdChange,
    showIds = false,
    annotationSession = "",
    trackingEnabled = false,
    onShowIdsChange,
    counterMetrics,
    counterVisibility = {},
    onCounterVisibilityChange,
    onResetCounter,
    counterLabels = [],
    counterPersonLabel,
}) => {
    const { t } = useLanguage();
    const [showSkeletons, setShowSkeletons] = useState(true);
    const [showConfidence, setShowConfidence] = useState(defaultShowConfidence);
    const [showLabels, setShowLabels] = useState(defaultShowLabels);
    const [showKeypoints, setShowKeypoints] = useState(true);
    const [selectedKeypoints, setSelectedKeypoints] = useState(
        () => POSE_KEYPOINT_LABELS.flatMap((keypoint, index) => (
            defaultSelectedKeypoints.includes(keypoint) ? [index] : []
        ))
    );
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [videoOverlayBounds, setVideoOverlayBounds] = useState({ left: 0, top: 0, width: 0, height: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenControls, setShowFullscreenControls] = useState(true);
    const [annotationSize, setAnnotationSize] = useState(1);
    const containerRef = useRef(null);
    const mediaContainerRef = useRef(null);
    const internalVideoRef = useRef(null);
    const activeVideoRef = internalVideoRef;
    const poses = useMemo(() => (Array.isArray(result) ? result : []), [result]);
    const visiblePoses = useMemo(() => poses.filter((pose) => (
        !Number.isFinite(confidenceThreshold)
        || !Number.isFinite(Number(pose?.confidence))
        || Number(pose.confidence) >= confidenceThreshold
    )), [confidenceThreshold, poses]);
    const keypointCounts = useMemo(() => POSE_KEYPOINT_LABELS.map((_, keypointIndex) => (
        visiblePoses.reduce((count, pose) => (
            asPoint(pose?.keypoints?.[keypointIndex]) ? count + 1 : count
        ), 0)
    )), [visiblePoses]);
    const imageUrl = useMemo(
        () => (typeof image === "string" ? image : image ? URL.createObjectURL(image) : ""),
        [image]
    );

    useEffect(() => {
        const videoElement = internalVideoRef.current;
        if (!videoElement || !videoStream) return undefined;

        videoElement.srcObject = videoStream;
        void videoElement.play();
        return () => {
            if (videoElement.srcObject === videoStream) videoElement.srcObject = null;
        };
    }, [videoStream]);

    useEffect(() => {
        if (typeof image === "string" || !imageUrl) return undefined;
        return () => URL.revokeObjectURL(imageUrl);
    }, [image, imageUrl]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentElementFullscreen = document.fullscreenElement === containerRef.current;
            setIsFullscreen(isCurrentElementFullscreen);
            if (isCurrentElementFullscreen) setShowFullscreenControls(true);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (!video || !activeVideoRef.current || !mediaContainerRef.current) return undefined;

        const videoElement = activeVideoRef.current;
        const syncOverlayBounds = () => {
            if (!videoElement.videoWidth || !videoElement.videoHeight) return;

            const videoRect = videoElement.getBoundingClientRect();
            const containerRect = mediaContainerRef.current.getBoundingClientRect();
            const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
            const elementAspect = videoElement.clientWidth / videoElement.clientHeight;
            const width = elementAspect > videoAspect
                ? videoElement.clientHeight * videoAspect
                : videoElement.clientWidth;
            const height = elementAspect > videoAspect
                ? videoElement.clientHeight
                : videoElement.clientWidth / videoAspect;

            setVideoOverlayBounds({
                left: videoRect.left - containerRect.left + (videoRect.width - width) / 2,
                top: videoRect.top - containerRect.top + (videoRect.height - height) / 2,
                width,
                height,
            });
        };
        const handleFullscreenChange = () => requestAnimationFrame(syncOverlayBounds);
        const resizeObserver = new ResizeObserver(syncOverlayBounds);

        videoElement.addEventListener("loadedmetadata", syncOverlayBounds);
        window.addEventListener("resize", syncOverlayBounds);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        resizeObserver.observe(videoElement);
        resizeObserver.observe(mediaContainerRef.current);
        syncOverlayBounds();

        return () => {
            videoElement.removeEventListener("loadedmetadata", syncOverlayBounds);
            window.removeEventListener("resize", syncOverlayBounds);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            resizeObserver.disconnect();
        };
    }, [video, activeVideoRef, isFullscreen]);

    const handleMediaLoad = (event) => {
        const media = event.target;
        setNaturalSize({
            width: media.naturalWidth || media.videoWidth || media.width || 1,
            height: media.naturalHeight || media.videoHeight || media.height || 1,
        });
        if (!video) onImageLoad?.(event);
    };

    const toggleFullscreen = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }

        await containerRef.current?.requestFullscreen({ navigationUI: "hide" });
    };

    const toggleKeypoint = (keypointIndex) => {
        setSelectedKeypoints((currentKeypoints) => (
            currentKeypoints.includes(keypointIndex)
                ? currentKeypoints.filter((currentIndex) => currentIndex !== keypointIndex)
                : [...currentKeypoints, keypointIndex]
        ));
    };

    return (
        <div className="w-full">
            {showSummary ? (
                <div className="mb-6 rounded-lg bg-blue-100 px-6 py-3 text-center text-lg font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {countLabel}: {visiblePoses.length}
                </div>
            ) : null}
            {image || video ? (
                <div
                    ref={containerRef}
                    className={isFullscreen
                        ? "relative block h-screen w-screen overflow-hidden bg-black"
                        : "grid w-full gap-4 bg-transparent lg:grid-cols-[minmax(0,1fr)_16rem]"}
                >
                    <div className={`flex min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-700 ${video === true ? "bg-black" : "bg-transparent"} ${isFullscreen
                        ? "absolute inset-0 rounded-none border-0 shadow-none"
                        : ""}`}>
                        <div
                            ref={mediaContainerRef}
                            className={`relative max-h-full max-w-full ${video ? "w-full" : "inline-block"} ${video === true ? "aspect-video bg-black" : ""}`}
                        >
                            {video ? (
                                <video
                                    src={typeof video === "string" ? video : undefined}
                                    ref={(element) => {
                                        internalVideoRef.current = element;
                                        onVideoElement?.(element);
                                    }}
                                    controls={typeof video === "string" && !videoStream}
                                    autoPlay={Boolean(videoStream)}
                                    muted={Boolean(videoStream)}
                                    playsInline
                                    className={`block h-auto w-full max-w-full object-contain ${video === true ? "h-full" : ""} ${isFullscreen ? "max-h-[calc(100vh-2rem)]" : "max-h-176"}`}
                                    onLoadedMetadata={handleMediaLoad}
                                />
                            ) : (
                                imageLink ? (
                                    <a
                                        href={imageLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={t("ui.openOriginalImage")}
                                        className="block cursor-pointer"
                                    >
                                        <img
                                            src={imageUrl}
                                            alt={alt ?? t("image.uploaded")}
                                            className={`block max-w-full object-contain ${isFullscreen ? "max-h-[calc(100vh-2rem)]" : "max-h-176"}`}
                                            onLoad={handleMediaLoad}
                                        />
                                    </a>
                                ) : (
                                    <img
                                        src={imageUrl}
                                        alt={alt ?? t("image.uploaded")}
                                        className={`block max-w-full object-contain ${isFullscreen ? "max-h-[calc(100vh-2rem)]" : "max-h-176"}`}
                                        onLoad={handleMediaLoad}
                                    />
                                )
                            )}
                            {(showSkeletons || showKeypoints || showLabels || showIds || counterMetrics?.length) && naturalSize.width > 0 && naturalSize.height > 0 ? (
                                <svg
                                    className={`pointer-events-none absolute ${video ? "" : "inset-0 h-full w-full"}`}
                                    style={video ? {
                                        left: videoOverlayBounds.left,
                                        top: videoOverlayBounds.top,
                                        width: videoOverlayBounds.width,
                                        height: videoOverlayBounds.height,
                                    } : undefined}
                                    viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                >
                                    {visiblePoses.map((pose, index) => (
                                        renderPose(
                                            pose,
                                            index,
                                            naturalSize.width,
                                            selectedKeypoints,
                                            showKeypoints,
                                            showSkeletons,
                                            showLabels,
                                            showConfidence,
                                            showIds,
                                            annotationSession,
                                            annotationSize,
                                            null,
                                            false,
                                            false
                                        )
                                    ))}
                                    {counterMetrics?.length ? visiblePoses.map((pose, index) => (
                                        renderPose(
                                            pose,
                                            index,
                                            naturalSize.width,
                                            selectedKeypoints,
                                            showKeypoints,
                                            showSkeletons,
                                            showLabels,
                                            showConfidence,
                                            showIds,
                                            annotationSession,
                                            annotationSize,
                                            counterMetrics.find((metric) => metric.trackId === pose?.track_id),
                                            counterVisibility[pose?.track_id]?.counter !== false,
                                            counterVisibility[pose?.track_id]?.angle !== false,
                                            true
                                        )
                                    )) : null}
                                </svg>
                            ) : null}
                        </div>
                    </div>
                    {showToggle ? (
                        <aside
                            className={`flex min-h-0 flex-col gap-4 text-gray-900 dark:text-gray-100 ${isFullscreen
                                ? "absolute right-4 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-64 -translate-y-1/2 overflow-y-auto rounded-xl border border-white/30 bg-black/60 p-4 shadow-lg backdrop-blur-sm"
                                : ""}`}
                            hidden={isFullscreen && !showFullscreenControls}
                        >
                            {extraControls}
                            <div className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                <button
                                    type="button"
                                    onClick={toggleFullscreen}
                                    className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                    aria-label={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                                    title={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                                >
                                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowSkeletons((visible) => !visible)}
                                    className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    {showSkeletons
                                        ? (hideLabel ?? t("image.hideSkeleton"))
                                        : (showLabel ?? t("image.showSkeleton"))}
                                </button>
                                {isFullscreen ? <FullscreenPanelToggle visible onClick={() => setShowFullscreenControls(false)} /> : null}
                            </div>
                            {counterMetrics?.length ? (
                                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                    <h3 className="border-b border-gray-200 pb-2 text-center font-semibold dark:border-gray-700">
                                        {t("ui.bicepCurlMetrics")}
                                    </h3>
                                    {counterMetrics.map((metric) => {
                                        const visibility = counterVisibility[metric.trackId] ?? {};
                                        return (
                                            <section key={metric.trackId} className="space-y-2 border-b border-gray-200 pb-3 last:border-0 dark:border-gray-700">
                                                <p className="font-medium">
                                                    {counterPersonLabel?.replace("{id}", String(metric.trackId))}
                                                </p>
                                                <Checkbox
                                                    checked={visibility.counter !== false}
                                                    onChange={(event) => onCounterVisibilityChange?.(metric.trackId, "counter", event.target.checked)}
                                                    className="text-xs"
                                                >
                                                    <span>{t("ui.showCurlCounter")}</span>
                                                </Checkbox>
                                                <Checkbox
                                                    checked={visibility.angle !== false}
                                                    onChange={(event) => onCounterVisibilityChange?.(metric.trackId, "angle", event.target.checked)}
                                                    className="text-xs"
                                                >
                                                    <span>{t("ui.showElbowAngle")}</span>
                                                </Checkbox>
                                                {onResetCounter ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onResetCounter(metric.trackId)}
                                                        className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                                                    >
                                                        {t("ui.resetCounter")}
                                                    </button>
                                                ) : null}
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {counterLabels.map((label, index) => `${label}: ${metric.counts[index]}`).join(" · ")}
                                                </p>
                                            </section>
                                        );
                                    })}
                                </div>
                            ) : null}
                            {onConfidenceThresholdChange ? (
                                <ConfidenceThresholdControl value={confidenceThreshold} onChange={onConfidenceThresholdChange} />
                            ) : null}
                            <div className="min-h-0 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                <div className="mb-2 border-b border-gray-200 pb-2 text-center font-semibold dark:border-gray-700">
                                    {t("ui.keypoints")}
                                </div>
                                <div className="mb-2 flex justify-between gap-3 border-b border-gray-200 pb-2 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedKeypoints(POSE_KEYPOINT_LABELS.map((_, index) => index))}
                                        className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                    >
                                        {t("ui.selectAll")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedKeypoints([])}
                                        className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                    >
                                        {t("ui.clearAll")}
                                    </button>
                                </div>
                                <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
                                    {POSE_KEYPOINT_LABELS.map((keypoint, keypointIndex) => (
                                        <label key={keypoint} className="flex cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="peer sr-only"
                                                checked={selectedKeypoints.includes(keypointIndex)}
                                                onChange={() => toggleKeypoint(keypointIndex)}
                                            />
                                            <span
                                                className="flex h-5 w-5 items-center justify-center rounded-md border border-gray-400 bg-gray-100 text-xs text-transparent transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-300 dark:border-gray-500 dark:bg-gray-700 dark:peer-checked:border-blue-400 dark:peer-checked:bg-blue-400"
                                                aria-hidden="true"
                                            >
                                                ✓
                                            </span>
                                            <span className="flex-1">
                                                {keypointLabels[keypointIndex] ?? keypoint}
                                            </span>
                                            <span className="ml-4 tabular-nums text-gray-500 dark:text-gray-400">
                                                {keypointCounts[keypointIndex]}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                <div className="mb-3 border-b border-gray-200 pb-2 text-center font-semibold dark:border-gray-700">
                                    {t("image.annotationOptions")}
                                </div>
                                <Checkbox
                                    checked={showLabels}
                                    onChange={(event) => setShowLabels(event.target.checked)}
                                    className="mb-2 text-xs"
                                >
                                    <span>{t("image.labels")}</span>
                                </Checkbox>
                                <Checkbox
                                    checked={showConfidence}
                                    onChange={(event) => setShowConfidence(event.target.checked)}
                                    className="mb-2 text-xs"
                                >
                                    <span>{t("image.confidence")}</span>
                                </Checkbox>
                                <Checkbox
                                    checked={showKeypoints}
                                    onChange={(event) => setShowKeypoints(event.target.checked)}
                                    className="mb-2 text-xs"
                                >
                                    <span>{t("image.keypoints")}</span>
                                </Checkbox>
                                <Checkbox
                                    checked={showSkeletons}
                                    onChange={(event) => setShowSkeletons(event.target.checked)}
                                    className="mb-2 text-xs"
                                >
                                    <span>{t("image.skeleton")}</span>
                                </Checkbox>
                                {trackingEnabled && onShowIdsChange ? (
                                    <Checkbox
                                        checked={showIds}
                                        onChange={(event) => onShowIdsChange(event.target.checked)}
                                        className="mb-2 text-xs"
                                    >
                                        <span>{t("ui.objectIds")}</span>
                                    </Checkbox>
                                ) : null}
                                <AnnotationSizeControl value={annotationSize} onChange={setAnnotationSize} />
                            </div>
                            {bottomControls}
                        </aside>
                    ) : null}
                    {isFullscreen && showToggle && !showFullscreenControls ? (
                        <FullscreenPanelToggle visible={false} onClick={() => setShowFullscreenControls(true)} />
                    ) : null}
                </div>
            ) : null}
            {showResponse ? <ApiResponseCard data={result} label={t("ui.apiResponse")} /> : null}
        </div>
    );
};
