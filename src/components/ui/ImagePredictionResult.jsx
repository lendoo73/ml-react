import { ImageWithAnnotations } from "./ImageWithBoxes.jsx";
import { useRef } from "react";

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
}) => {
    const resultRef = useRef(null);
const scrollToResult = () => {
    const element = resultRef.current;
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
};

    return (
    <div ref={resultRef} className="mt-8 w-full border-t border-gray-200 pt-6 dark:border-gray-700">
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
            />
        ) : null}
        <div className="mt-6 w-full overflow-hidden rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <div className="rounded-lg bg-blue-100 px-6 py-3 text-center text-lg font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {responseLabel}
            </div>
            <div className="max-h-64 overflow-y-auto bg-white p-4 text-sm dark:bg-gray-800">
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(result, null, 4)}</pre>
            </div>
        </div>
    </div>
    );
};
