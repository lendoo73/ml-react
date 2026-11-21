import { Fragment, useState, useRef, useEffect, useMemo } from "react";
import { Maximize, Minimize } from "lucide-react";
import { useLanguage } from "../../context/useLanguage.js";
import { Checkbox } from "./Checkbox.jsx";
import { ConfidenceThresholdControl } from "./ConfidenceThresholdControl.jsx";
import { AnnotationSizeControl } from "./AnnotationSizeControl.jsx";
import { FullscreenPanelToggle } from "./FullscreenMediaLayout.jsx";
import { getAnnotationColor } from "../../utils/getAnnotationColor.js";
import { ClassColorRow } from "./ClassColorRow.jsx";
import { getOrientedBoxLabelGeometry } from "../../features/obb/utils/getOrientedBoxLabelGeometry.js";

const EMPTY_CLASSES = [];

export const ImageWithAnnotations = (
    {
       image,
       boxes = [],
       polygons = [],
       showToggle = true,
       width = "max-w-md",
       showLabel = "Show boxes",
       hideLabel = "Hide boxes",
       alt = "Uploaded image",
       onImageLoad,
       showBoundaryToggle = false,
       showOrientedBoxToggle = false,
       boundaryBoxesDefault = false,
       confidenceThreshold = 0.5,
       onConfidenceThresholdChange,
       imageFooter,
       availableClasses = EMPTY_CLASSES,
       showClassesPanel = false,
    }) => {
    const { t } = useLanguage();
    const [showBoxes, setShowBoxes] = useState(true);
    const [showConfidence, setShowConfidence] = useState(false);
    const [showLabels, setShowLabels] = useState(true);
    const [showBoundaryBoxes, setShowBoundaryBoxes] = useState(boundaryBoxesDefault);
    const [showOrientedBoxes, setShowOrientedBoxes] = useState(true);
    const [annotationSize, setAnnotationSize] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenControls, setShowFullscreenControls] = useState(true);
    const [classSelection, setClassSelection] = useState({ key: "", values: [] });
    const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [fullscreenImageSize, setFullscreenImageSize] = useState({ width: 0, height: 0 });
    const imgRef = useRef();
    const containerRef = useRef();

    const normalizedBoxes = useMemo(() => (
        Array.isArray(boxes) ? boxes.filter((box) => !box?.obb?.corners?.length) : []
    ), [boxes]);
    const normalizedPolygons = useMemo(() => ([
        ...(Array.isArray(polygons) ? polygons : []),
        ...(Array.isArray(boxes) ? boxes
            .filter((box) => Array.isArray(box?.obb?.corners) && box.obb.corners.length >= 3)
            .map((box) => ({ ...box, polygon: box.obb.corners, isOrientedBox: true })) : []),
    ]), [boxes, polygons]);
    const polygonBoxes = useMemo(() => normalizedPolygons.map((polygon) => {
        const points = polygon.polygon ?? [];
        const xs = points.map(([x]) => x);
        const ys = points.map(([, y]) => y);
        return xs.length ? { ...polygon, bbox: { x_min: Math.min(...xs), y_min: Math.min(...ys), x_max: Math.max(...xs), y_max: Math.max(...ys) } } : polygon;
    }), [normalizedPolygons]);
    const annotations = useMemo(() => [...normalizedBoxes, ...normalizedPolygons], [normalizedBoxes, normalizedPolygons]);
    const renderedBoxes = showBoundaryToggle
        ? [...normalizedBoxes, ...polygonBoxes.filter((polygon) => !polygon.isOrientedBox)]
        : normalizedBoxes;
    const classes = useMemo(() => (
        [...new Set([
            ...annotations.map((annotation) => annotation.class_name),
            ...availableClasses,
        ].filter(Boolean))]
    ), [annotations, availableClasses]);
    const classCounts = useMemo(() => annotations.reduce((counts, annotation) => {
        if (annotation.class_name) counts[annotation.class_name] = (counts[annotation.class_name] ?? 0) + 1;
        return counts;
    }, {}), [annotations]);
    const coordinateSize = useMemo(() => {
        const coordinates = annotations.flatMap((annotation) => {
            if (Array.isArray(annotation.polygon)) return annotation.polygon;
            if (annotation.bbox) {
                return [
                    [annotation.bbox.x_max, annotation.bbox.y_max],
                    [annotation.bbox.x_min, annotation.bbox.y_min],
                ];
            }
            return [];
        });
        return {
            width: Math.max(naturalSize.width, ...coordinates.map(([x]) => x ?? 0)),
            height: Math.max(naturalSize.height, ...coordinates.map(([, y]) => y ?? 0)),
        };
    }, [annotations, naturalSize]);
    const classKey = classes.join("\u0000");

    const selectedClasses = classSelection.key === classKey ? classSelection.values : classes;
    const updateSelectedClasses = (values) => setClassSelection({ key: classKey, values });


    useEffect(() => {
        const img = imgRef.current;
        if (!img) return;

        const updateSize = () => {
            setImgSize({ width: img.clientWidth, height: img.clientHeight });
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        };

        img.addEventListener("load", updateSize);
        window.addEventListener("resize", updateSize);
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(img);
        updateSize();

        return () => {
            img.removeEventListener("load", updateSize);
            window.removeEventListener("resize", updateSize);
            resizeObserver.disconnect();
        };
    }, [image]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentElementFullscreen = document.fullscreenElement === containerRef.current;
            setIsFullscreen(isCurrentElementFullscreen);
            if (isCurrentElementFullscreen) setShowFullscreenControls(true);
            requestAnimationFrame(() => {
                const img = imgRef.current;
                if (img) setImgSize({ width: img.clientWidth, height: img.clientHeight });
            });
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (!isFullscreen || !naturalSize.width || !naturalSize.height) return undefined;

        const updateFullscreenImageSize = () => {
            const scale = Math.min(
                window.innerWidth / naturalSize.width,
                window.innerHeight / naturalSize.height,
            );
            setFullscreenImageSize({
                width: naturalSize.width * scale,
                height: naturalSize.height * scale,
            });
        };

        updateFullscreenImageSize();
        window.addEventListener("resize", updateFullscreenImageSize);
        return () => window.removeEventListener("resize", updateFullscreenImageSize);
    }, [isFullscreen, naturalSize]);

    const imageUrl = useMemo(() => {
        if (!image) return "";
        return typeof image === "string" ? image : URL.createObjectURL(image);
    }, [image]);

    useEffect(() => {
        if (!image || typeof image === "string") return undefined;
        return () => URL.revokeObjectURL(imageUrl);
    }, [image, imageUrl]);

    if (!image) return null;
    const toggleFullscreen = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }

        await containerRef.current?.requestFullscreen({ navigationUI: "hide" });
    };

    const isSmallBox = (bbox, scaleX, scaleY) => {
        const boxWidth = (bbox.x_max - bbox.x_min) * scaleX;
        const boxHeight = (bbox.y_max - bbox.y_min) * scaleY;

        return boxWidth < 96 || boxHeight < 48;
    };

    const getLabelPosition = (bbox, scaleX, scaleY) => (
        isSmallBox(bbox, scaleX, scaleY) || bbox.y_min * scaleY < 28 * annotationSize
            ? "left-0 top-0"
            : "left-0 top-0 -translate-y-full"
    );
    const hasValidImageSize = naturalSize.width > 0 && naturalSize.height > 0 && imgSize.width > 0 && imgSize.height > 0;
    const imageOffsetX = 0;
    const imageOffsetY = 0;

    return (
        <div
            ref={containerRef}
            className={isFullscreen
                ? "relative flex h-full w-full max-w-none items-center justify-center overflow-hidden bg-black"
                : `relative mb-16 w-full bg-transparent ${width} lg:mb-0 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center lg:gap-4`}
        >
            <div
                className={`relative min-w-0 ${isFullscreen ? "max-h-full max-w-full" : ""}`}
                style={isFullscreen && fullscreenImageSize.width > 0 ? fullscreenImageSize : undefined}
            >
            <img
                ref={imgRef}
                src={imageUrl}
                alt={alt}
                className={`block ${isFullscreen ? "h-full w-full object-contain" : "w-full"}`}
                onLoad={(event) => {
                    const loadedImage = event.currentTarget;
                    setImgSize({ width: loadedImage.clientWidth, height: loadedImage.clientHeight });
                    setNaturalSize({ width: loadedImage.naturalWidth, height: loadedImage.naturalHeight });
                    onImageLoad?.(event);
                }}
            />

            {showBoxes &&
                normalizedPolygons
                    .filter((polygon) => selectedClasses.includes(polygon.class_name)
                        && (!polygon.isOrientedBox || showOrientedBoxes))
                    .map((polygon, index) => {
                        const points = polygon.polygon ?? [];
                        if (points.length < 2) return null;
                        const annotationColor = getAnnotationColor(polygon.class_name);
                        const minX = Math.min(...points.map(([x]) => x));
                        const minY = Math.min(...points.map(([, y]) => y));
                        const labelGeometry = polygon.isOrientedBox
                            ? getOrientedBoxLabelGeometry(points)
                            : null;
                        const confidenceText = Number.isFinite(polygon.confidence)
                            ? `${(polygon.confidence * 100).toFixed(1)}%`
                            : "";
                        const labelParts = [
                            showLabels ? polygon.class_name : "",
                            showConfidence ? confidenceText : "",
                        ].filter(Boolean);
                        return (
                            <Fragment key={`polygon-${index}`}>
                                <svg
                                    className="pointer-events-none absolute z-10"
                                    style={{
                                        left: imageOffsetX,
                                        top: imageOffsetY,
                                        width: imgSize.width,
                                        height: imgSize.height,
                                    }}
                                    viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}
                                    preserveAspectRatio="none"
                                >
                                    <polygon
                                        points={points
                                            .map(([x, y]) => `${x * imgSize.width / coordinateSize.width},${y * imgSize.height / coordinateSize.height}`)
                                            .join(" ")}
                                        fill={annotationColor.color}
                                        fillOpacity="0.35"
                                        stroke={annotationColor.color}
                                        strokeWidth={3 * annotationSize}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                </svg>
                                {polygon.isOrientedBox && labelParts.length > 0 ? (
                                    <div
                                        className="pointer-events-none absolute z-20 flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold shadow-sm"
                                        style={{
                                            left: imageOffsetX + (labelGeometry?.x ?? minX) * imgSize.width / coordinateSize.width,
                                            top: Math.max(0, imageOffsetY + (labelGeometry?.y ?? minY) * imgSize.height / coordinateSize.height),
                                            transform: `translate(-50%, -100%) rotate(${labelGeometry?.angle ?? 0}rad)`,
                                            transformOrigin: "center",
                                            backgroundColor: annotationColor.color,
                                            color: annotationColor.textColor,
                                            fontSize: `${0.75 * annotationSize}rem`,
                                            lineHeight: `${annotationSize}rem`,
                                        }}
                                    >
                                        {showLabels ? <span>{polygon.class_name}</span> : null}
                                        {showConfidence && confidenceText ? <span>{confidenceText}</span> : null}
                                    </div>
                                ) : null}
                            </Fragment>
                        );
                    })}
            {showBoxes &&
                renderedBoxes
                    .filter((box) => selectedClasses.includes(box.class_name))
                    .map((r, index) => {
                    const { bbox } = r;
                    const hasValidBoundingBox = bbox
                        && ["x_min", "y_min", "x_max", "y_max"]
                            .every((key) => Number.isFinite(bbox[key]));

                    if (!hasValidImageSize || !hasValidBoundingBox) return null;

                    const scaleX = imgSize.width / coordinateSize.width;
                    const scaleY = imgSize.height / coordinateSize.height;
                    const confidenceText = `${(r.confidence * 100).toFixed(1)}%`;
                    const annotationColor = getAnnotationColor(r.class_name);
                    const labelText = [
                        showLabels ? r.class_name : "",
                        showConfidence ? confidenceText : "",
                    ].filter(Boolean).join(" ");
                    const boxWidth = (bbox.x_max - bbox.x_min) * scaleX;
                    return (
                        <div
                            key={index}
                            className="group absolute border-solid"
                            style={{
                                left: imageOffsetX + bbox.x_min * scaleX,
                                top: imageOffsetY + bbox.y_min * scaleY,
                                width: (bbox.x_max - bbox.x_min) * scaleX,
                                height: (bbox.y_max - bbox.y_min) * scaleY,
                                borderWidth: `${2 * annotationSize}px`,
                                borderColor: showBoundaryToggle && !showBoundaryBoxes ? "transparent" : annotationColor.color,
                            }}
                            title={labelText}
                            aria-label={labelText}
                        >
                            <div
                                className={`${getLabelPosition(bbox, scaleX, scaleY)} absolute z-10 box-border overflow-hidden rounded-md px-2 py-1 text-xs font-semibold shadow-sm`}
                                style={{ width: `${Math.max(boxWidth, 120)}px`, fontSize: `${0.75 * annotationSize}rem`, lineHeight: `${annotationSize}rem`, backgroundColor: annotationColor.color, color: annotationColor.textColor }}
                                hidden={!showLabels && !showConfidence}
                                title={labelText}
                                aria-label={labelText}
                            >
                                <span className="flex w-full items-center justify-between gap-2 whitespace-nowrap">
                                    {showLabels ? <span className="min-w-0 truncate">{r.class_name}</span> : null}
                                    {showConfidence ? <span className="shrink-0">{confidenceText}</span> : null}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {imageFooter && !isFullscreen ? <div className="mt-4 w-full">{imageFooter}</div> : null}
            </div>
            {imageFooter && isFullscreen ? (
                <div className="absolute inset-x-4 bottom-4 z-40 mx-auto max-w-4xl opacity-50 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100">
                    {imageFooter}
                </div>
            ) : null}
            <div className={`flex min-w-0 flex-col gap-4 ${isFullscreen
                ? "absolute right-4 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-64 -translate-y-1/2 overflow-y-auto"
                : "lg:col-start-2"}`}
                hidden={isFullscreen && !showFullscreenControls}
            >
            {(showToggle && annotations.length > 0) || image ? (
                <div data-prediction-control className={`flex items-start justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${isFullscreen ? "relative" : ""}`}>
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        aria-label={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                        title={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                    >
                        {isFullscreen ? <Minimize                                                 className="h-4 w-4 cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:accent-blue-400" /> : <Maximize className="h-4 w-4" />}
                    </button>
                    {showToggle && annotations.length > 0 ? (
                        <button
                            type="button"
                            onClick={() => setShowBoxes((visible) => !visible)}
                            className={`
                                rounded-lg bg-blue-600 px-3 py-1 text-sm text-white
                                hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                                ${isFullscreen ? "absolute left-1/2 -translate-x-1/2" : ""}
                            `}
                        >
                            {showBoxes ? hideLabel : showLabel}
                        </button>
                    ) : <span />}
                    {isFullscreen ? <FullscreenPanelToggle visible onClick={() => setShowFullscreenControls(false)} /> : null}
                </div>
            ) : null}
            {onConfidenceThresholdChange ? (
                <div data-prediction-control>
                    <ConfidenceThresholdControl
                        value={confidenceThreshold}
                        onChange={onConfidenceThresholdChange}
                    />
                </div>
            ) : null}

            {annotations.length > 0 || showClassesPanel ? (
                <div data-prediction-control className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                            <div className="mb-2 border-b border-gray-200 pb-2 text-center text-sm font-semibold dark:border-gray-700">
                                {t("ui.classes")}
                            </div>
                            {classes.length > 0 ? (
                                <>
                                    <div className="mb-2 flex justify-between gap-3 border-b border-gray-200 pb-2 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={() => updateSelectedClasses(classes)}
                                            className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                        >
                                            {t("ui.selectAll")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateSelectedClasses([])}
                                            className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                        >
                                            {t("ui.clearAll")}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {classes.map((className) => (
                                            <ClassColorRow
                                                key={className}
                                                className={className}
                                                checked={selectedClasses.includes(className)}
                                                count={classCounts[className] ?? 0}
                                                colors={getAnnotationColor(className)}
                                                onChange={() => updateSelectedClasses(
                                                    selectedClasses.includes(className)
                                                        ? selectedClasses.filter((currentClass) => currentClass !== className)
                                                        : [...selectedClasses, className]
                                                )}
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : showClassesPanel ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t("ui.noClassesDetected")}</p>
                            ) : null}
                </div>
            ) : null}
            {showBoundaryToggle ? (
                <div data-prediction-control className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                    <div className="mb-2 border-b border-gray-200 pb-2 text-center text-sm font-semibold dark:border-gray-700">
                        {t("image.annotationOptions")}
                    </div>
                    {showOrientedBoxToggle ? (
                        <Checkbox checked={showOrientedBoxes} onChange={(event) => setShowOrientedBoxes(event.target.checked)} className="mb-2 text-xs">
                            <span>{t("image.orientedBoxes")}</span>
                        </Checkbox>
                    ) : (
                        <Checkbox checked={showBoundaryBoxes} onChange={(event) => setShowBoundaryBoxes(event.target.checked)} className="mb-2 text-xs">
                            <span>{t("image.boundaryBoxes")}</span>
                        </Checkbox>
                    )}
                    <Checkbox checked={showConfidence} onChange={(event) => setShowConfidence(event.target.checked)} className="mb-2 text-xs">
                        <span>{t("image.confidence")}</span>
                    </Checkbox>
                    <Checkbox checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} className="text-xs">
                        <span>{t("image.labels")}</span>
                    </Checkbox>
                    <AnnotationSizeControl value={annotationSize} onChange={setAnnotationSize} />
                </div>
            ) : null}
            </div>
            {isFullscreen && !showFullscreenControls ? (
                <FullscreenPanelToggle visible={false} onClick={() => setShowFullscreenControls(true)} />
            ) : null}
        </div>
    );
};

export const ImageWithBoxes = ImageWithAnnotations;
