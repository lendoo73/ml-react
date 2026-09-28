import { ImageWithAnnotations } from "./ImageWithBoxes.jsx";
import { useRef } from "react";
import { ApiResponseCard } from "./ApiResponseCard.jsx";

export const ImagePredictionResult = ({
    image,
    result,
    countLabel,
    count,
    boxes = [],
    polygons = [],
    showLabel,
    hideLabel,
    alt,
    responseLabel,
    imageWidth = "max-w-3xl",
    showBoundaryToggle = false,
    boundaryBoxesDefault = false,
    confidenceThreshold,
    onConfidenceThresholdChange,
}) => {
    const resultRef = useRef(null);
const scrollToResult = () => {
    const element = resultRef.current;
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
};

    return (
    <div ref={resultRef} className="w-full">
        <div className="mb-6 rounded-lg bg-blue-100 px-6 py-3 text-center text-lg font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {countLabel}: {count}
        </div>
        {image ? (
            <ImageWithAnnotations
                image={image}
                boxes={boxes}
                polygons={polygons}
                showLabel={showLabel}
                hideLabel={hideLabel}
                alt={alt}
                onImageLoad={scrollToResult}
                width={imageWidth}
                showBoundaryToggle={showBoundaryToggle}
                boundaryBoxesDefault={boundaryBoxesDefault}
                confidenceThreshold={confidenceThreshold}
                onConfidenceThresholdChange={onConfidenceThresholdChange}
            />
        ) : null}
        <ApiResponseCard data={result} label={responseLabel} />
    </div>
    );
};
