import { useState, useRef, useEffect, useMemo } from "react";
import { Maximize, Minimize } from "lucide-react";
import { useLanguage } from "../../context/useLanguage.js";

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
    }) => {
    const { t } = useLanguage();
    const [showBoxes, setShowBoxes] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [classSelection, setClassSelection] = useState({ key: "", values: [] });
    const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const imgRef = useRef();
    const containerRef = useRef();

    const normalizedBoxes = useMemo(() => (Array.isArray(boxes) ? boxes : []), [boxes]);
    const normalizedPolygons = useMemo(() => (Array.isArray(polygons) ? polygons : []), [polygons]);
    const annotations = useMemo(() => [...normalizedBoxes, ...normalizedPolygons], [normalizedBoxes, normalizedPolygons]);
    const classes = useMemo(() => (
        [...new Set(annotations.map((annotation) => annotation.class_name).filter(Boolean))]
    ), [annotations]);
    const classCounts = useMemo(() => annotations.reduce((counts, annotation) => {
        if (annotation.class_name) counts[annotation.class_name] = (counts[annotation.class_name] ?? 0) + 1;
        return counts;
    }, {}), [annotations]);
    const classKey = classes.join("\u0000");

    const selectedClasses = classSelection.key === classKey ? classSelection.values : classes;
    const updateSelectedClasses = (values) => setClassSelection({ key: classKey, values });

    useEffect(() => {
        const img = imgRef.current;
        if (!img) return;

        const updateSize = () => {
            setImgSize({ width: img.clientWidth, height: img.clientHeight });
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            setContainerSize({
                width: containerRef.current?.clientWidth ?? 0,
                height: containerRef.current?.clientHeight ?? 0,
            });
        };

        img.addEventListener("load", updateSize);
        window.addEventListener("resize", updateSize);

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

    if (!image) return null;
    const imageUrl = typeof image === "string" ? image : URL.createObjectURL(image);

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
    const imageOffsetX = isFullscreen
        ? (containerSize.width - imgSize.width) / 2
        : 0;
    const imageOffsetY = isFullscreen
        ? (containerSize.height - imgSize.height) / 2
        : 0;

    return (
        <div
            ref={containerRef}
            className={`relative mb-16 w-full bg-black ${width} lg:mb-0 ${isFullscreen ? "flex items-center justify-center" : ""}`}
        >
            <img
                ref={imgRef}
                src={imageUrl}
                alt={alt}
                className={`block ${isFullscreen ? "max-h-screen max-w-full object-contain" : "w-full"}`}
                onLoad={onImageLoad}
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
                                viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
                                preserveAspectRatio="none"
                            >
                                <polygon points={points.map(([x, y]) => `${x},${y}`).join(" ")} fill={color} fillOpacity="0.35" stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" />
                            </svg>
                        );
                    })}
            {showBoxes &&
                normalizedBoxes
                    .filter((box) => selectedClasses.includes(box.class_name))
                    .map((r, index) => {
                    const { bbox } = r;
                    const hasValidBoundingBox = bbox
                        && ["x_min", "y_min", "x_max", "y_max"]
                            .every((key) => Number.isFinite(bbox[key]));

                    if (!hasValidImageSize || !hasValidBoundingBox) return null;

                    const scaleX = imgSize.width / naturalSize.width;
                    const scaleY = imgSize.height / naturalSize.height;
                    const labelText = `${r.class_name} ${(r.confidence * 100).toFixed(1)}%`;
                    const boxWidth = (bbox.x_max - bbox.x_min) * scaleX;
                    return (
                        <div
                            key={index}
                            className="group absolute border-2 border-red-500"
                            style={{
                                left: imageOffsetX + bbox.x_min * scaleX,
                                top: imageOffsetY + bbox.y_min * scaleY,
                                width: (bbox.x_max - bbox.x_min) * scaleX,
                                height: (bbox.y_max - bbox.y_min) * scaleY,
                            }}
                            title={labelText}
                            aria-label={labelText}
                        >
                            <div
                                className={`${getLabelPosition(bbox, scaleX, scaleY)} absolute z-10 box-border overflow-hidden rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-sm opacity-90 transition group-hover:opacity-100`}
                                style={{ width: `${Math.max(boxWidth, 24)}px` }}
                                title={labelText}
                                aria-label={labelText}
                            >
                                <span className="block truncate whitespace-nowrap">
                                    {labelText}
                                </span>
                            </div>
                        </div>
                    );
                })}

            {(showToggle && annotations.length > 0) || image ? (
                <div className="absolute left-2 right-2 top-[calc(100%+1rem)] z-30 flex items-start justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:left-[calc(100%+1rem)] lg:right-auto lg:top-2 lg:w-64 lg:flex-row">
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

            {annotations.length > 0 ? (
                <div className="absolute bottom-[-4rem] left-2 z-40 min-w-56 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 lg:bottom-auto lg:left-[calc(100%+1rem)] lg:top-24 lg:w-64">
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
        </div>
    );
};

export const ImageWithBoxes = ImageWithAnnotations;
