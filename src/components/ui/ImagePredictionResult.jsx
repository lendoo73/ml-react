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
    imageWidth = "max-w-none w-full",
    showBoundaryToggle = false,
    showOrientedBoxToggle = false,
    boundaryBoxesDefault = false,
    confidenceThreshold,
    onConfidenceThresholdChange,
    showResponse = true,
    scrollToResultOnImageLoad = true,
    imageFooter,
    availableClasses,
    showClassesPanel = false,
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
                onImageLoad={scrollToResultOnImageLoad ? scrollToResult : undefined}
                width={imageWidth}
                showBoundaryToggle={showBoundaryToggle}
                showOrientedBoxToggle={showOrientedBoxToggle}
                boundaryBoxesDefault={boundaryBoxesDefault}
                confidenceThreshold={confidenceThreshold}
                onConfidenceThresholdChange={onConfidenceThresholdChange}
                imageFooter={imageFooter}
                availableClasses={availableClasses}
                showClassesPanel={showClassesPanel}
            />
        ) : null}
        {showResponse ? <ApiResponseCard data={result} label={responseLabel} /> : null}
    </div>
    );
};
