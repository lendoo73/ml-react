import { useState, useRef, useEffect, useMemo } from "react";
import { Maximize, Minimize } from "lucide-react";
import { useLanguage } from "../../context/useLanguage.js";
import { Checkbox } from "./Checkbox.jsx";
import { ConfidenceThresholdControl } from "./ConfidenceThresholdControl.jsx";
import { AnnotationSizeControl } from "./AnnotationSizeControl.jsx";

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
       boundaryBoxesDefault = false,
       confidenceThreshold = 0.5,
       onConfidenceThresholdChange,
    }) => {
    const { t } = useLanguage();
    const [showBoxes, setShowBoxes] = useState(true);
    const [showConfidence, setShowConfidence] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [showBoundaryBoxes, setShowBoundaryBoxes] = useState(boundaryBoxesDefault);
    const [annotationSize, setAnnotationSize] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [classSelection, setClassSelection] = useState({ key: "", values: [] });
    const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const imgRef = useRef();
    const containerRef = useRef();

    const normalizedBoxes = useMemo(() => (Array.isArray(boxes) ? boxes : []), [boxes]);
    const normalizedPolygons = useMemo(() => (Array.isArray(polygons) ? polygons : []), [polygons]);
    const polygonBoxes = useMemo(() => normalizedPolygons.map((polygon) => {
        const points = polygon.polygon ?? [];
        const xs = points.map(([x]) => x);
        const ys = points.map(([, y]) => y);
        return xs.length ? { ...polygon, bbox: { x_min: Math.min(...xs), y_min: Math.min(...ys), x_max: Math.max(...xs), y_max: Math.max(...ys) } } : polygon;
    }), [normalizedPolygons]);
    const annotations = useMemo(() => [...normalizedBoxes, ...normalizedPolygons], [normalizedBoxes, normalizedPolygons]);
    const renderedBoxes = showBoundaryToggle ? [...normalizedBoxes, ...polygonBoxes] : normalizedBoxes;
    const classes = useMemo(() => (
        [...new Set(annotations.map((annotation) => annotation.class_name).filter(Boolean))]
    ), [annotations]);
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
        updateSize();

        return () => {
            img.removeEventListener("load", updateSize);
            window.removeEventListener("resize", updateSize);
        };
    }, [image]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
            requestAnimationFrame(() => {
                const img = imgRef.current;
                if (img) setImgSize({ width: img.clientWidth, height: img.clientHeight });
            });
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

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

        await containerRef.current?.requestFullscreen();
    };

    const isSmallBox = (bbox, scaleX, scaleY) => {
        const boxWidth = (bbox.x_max - bbox.x_min) * scaleX;
        const boxHeight = (bbox.y_max - bbox.y_min) * scaleY;

        return boxWidth < 96 || boxHeight < 48;
    };

    const getLabelPosition = (bbox, scaleX, scaleY) => (
        isSmallBox(bbox, scaleX, scaleY)
            ? "left-0 top-0"
            : "left-0 top-0 -translate-y-full"
    );
    const hasValidImageSize = naturalSize.width > 0 && naturalSize.height > 0 && imgSize.width > 0 && imgSize.height > 0;
    const imageOffsetX = 0;
    const imageOffsetY = 0;

    return (
        <div
            ref={containerRef}
            className={`relative mb-16 w-full bg-transparent ${width} lg:mb-0 ${isFullscreen ? "flex items-center justify-center" : "lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center lg:gap-4"}`}
        >
            <div className={`relative min-w-0 ${isFullscreen ? "w-fit max-w-full" : ""}`}>
            <img
                ref={imgRef}
                src={imageUrl}
                alt={alt}
                className={`block ${isFullscreen ? "max-h-screen max-w-full object-contain" : "w-full"}`}
                onLoad={(event) => {
                    const loadedImage = event.currentTarget;
                    setImgSize({ width: loadedImage.clientWidth, height: loadedImage.clientHeight });
                    setNaturalSize({ width: loadedImage.naturalWidth, height: loadedImage.naturalHeight });
                    onImageLoad?.(event);
                }}
            />

            {showBoxes &&
                normalizedPolygons
                    .filter((polygon) => selectedClasses.includes(polygon.class_name))
                    .map((polygon, index) => {
                        const points = polygon.polygon ?? [];
                        if (points.length < 2) return null;
                        const color = `hsl(${(polygon.class_id * 67) % 360} 80% 50%)`;
                        return (
                            <svg
                                key={`polygon-${index}`}
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
                                    fill={color}
                                    fillOpacity="0.35"
                                    stroke={color}
                                    strokeWidth={3 * annotationSize}
                                    vectorEffect="non-scaling-stroke"
                                />
                            </svg>
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
                    const labelText = [
                        showLabels ? r.class_name : "",
                        showConfidence ? confidenceText : "",
                    ].filter(Boolean).join(" ");
                    const boxWidth = (bbox.x_max - bbox.x_min) * scaleX;
                    return (
                        <div
                            key={index}
                            className={`group absolute ${showBoundaryToggle && !showBoundaryBoxes ? "border-transparent" : "border-red-500"}`}
                            style={{
                                left: imageOffsetX + bbox.x_min * scaleX,
                                top: imageOffsetY + bbox.y_min * scaleY,
                                width: (bbox.x_max - bbox.x_min) * scaleX,
                                height: (bbox.y_max - bbox.y_min) * scaleY,
                                borderWidth: `${2 * annotationSize}px`,
                            }}
                            title={labelText}
                            aria-label={labelText}
                        >
                            <div
                                className={`${getLabelPosition(bbox, scaleX, scaleY)} absolute z-10 box-border overflow-hidden rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-sm opacity-90 transition group-hover:opacity-100`}
                                style={{ width: `${Math.max(boxWidth, 24)}px`, fontSize: `${0.75 * annotationSize}rem`, lineHeight: `${1 * annotationSize}rem` }}
                                hidden={!showLabels && !showConfidence}
                                title={labelText}
                                aria-label={labelText}
                            >
                                <span className="block truncate whitespace-nowrap">{labelText}</span>
                            </div>
                        </div>
                    );
                })}

            </div>
            <div className={`flex min-w-0 flex-col gap-4 lg:col-start-2 ${isFullscreen ? "hidden" : ""}`}>
            {(showToggle && annotations.length > 0) || image ? (
                <div data-prediction-control className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
                            className="
                                rounded-lg bg-blue-600 px-3 py-1 text-sm text-white
                                hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                            "
                        >
                            {showBoxes ? hideLabel : showLabel}
                        </button>
                    ) : <span />}
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

            {annotations.length > 0 ? (
                <div data-prediction-control className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                            <div className="mb-2 border-b border-gray-200 pb-2 text-center text-sm font-semibold dark:border-gray-700">
                                {t("ui.classes")}
                            </div>
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
                                    <label key={className} className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={selectedClasses.includes(className)}
                                            onChange={() => updateSelectedClasses(
                                                selectedClasses.includes(className)
                                                    ? selectedClasses.filter((currentClass) => currentClass !== className)
                                                    : [...selectedClasses, className]
                                            )}
                                        />
                                        <span
                                            className="flex h-5 w-5 items-center justify-center rounded-md border border-gray-400 bg-gray-100 text-xs text-transparent transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-300 dark:border-gray-500 dark:bg-gray-700 dark:peer-checked:border-blue-400 dark:peer-checked:bg-blue-400"
                                            aria-hidden="true"
                                        >
                                            ✓
                                        </span>
                                        <span className="flex-1">{className}</span>
                                        <span className="ml-4 tabular-nums text-gray-500 dark:text-gray-400">
                                            {classCounts[className] ?? 0}
                                        </span>
                                    </label>
                                ))}
                            </div>
                </div>
            ) : null}
            {showBoundaryToggle ? (
                <div data-prediction-control className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                    <div className="mb-2 border-b border-gray-200 pb-2 text-center text-sm font-semibold dark:border-gray-700">
                        {t("image.annotationOptions")}
                    </div>
                    <Checkbox checked={showBoundaryBoxes} onChange={(event) => setShowBoundaryBoxes(event.target.checked)} className="mb-2 text-xs">
                        <span>{t("image.boundaryBoxes")}</span>
                    </Checkbox>
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
        </div>
    );
};

export const ImageWithBoxes = ImageWithAnnotations;
