import { useState, useRef, useEffect } from "react";

export const ImageWithBoxes = (
    {
       image,
       boxes = [],
       showToggle = true,
       width = "max-w-md",
       showLabel = "Show boxes",
       hideLabel = "Hide boxes",
       alt = "Uploaded image",
    }) => {
    const [showBoxes, setShowBoxes] = useState(true);
    const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
    const imgRef = useRef();

    if (!image) return null;
    const imageUrl = typeof image === "string" ? image : URL.createObjectURL(image);

    useEffect(() => {
        const img = imgRef.current;
        if (!img) return;

        const updateSize = () => {
            setImgSize({ width: img.clientWidth, height: img.clientHeight });
        };

        img.addEventListener("load", updateSize);
        window.addEventListener("resize", updateSize);

        return () => {
            img.removeEventListener("load", updateSize);
            window.removeEventListener("resize", updateSize);
        };
    }, [image]);

    return (
        <div className={`relative w-full ${width}`}>
            <img
                ref={imgRef}
                src={imageUrl}
                alt={alt}
                className="w-full block"
            />

            {showBoxes &&
                boxes.map((r, index) => {
                    const { bbox } = r;
                    if (!imgRef.current) return null;

                    const scaleX = imgSize.width / imgRef.current.naturalWidth;
                    const scaleY = imgSize.height / imgRef.current.naturalHeight;

                    return (
                        <div
                            key={index}
                            className="absolute border-2 border-red-500"
                            style={{
                                left: bbox.x_min * scaleX,
                                top: bbox.y_min * scaleY,
                                width: (bbox.x_max - bbox.x_min) * scaleX,
                                height: (bbox.y_max - bbox.y_min) * scaleY,
                            }}
                        />
                    );
                })}

            {showToggle && boxes.length > 0 && (
                <button
                    onClick={() => setShowBoxes(!showBoxes)}
                    className="
                        absolute top-2 right-2
                        px-3 py-1 text-sm rounded-lg
                        bg-blue-600 text-white
                        hover:bg-blue-700
                        dark:bg-blue-500 dark:hover:bg-blue-600
                    "
                >
                    {showBoxes ? hideLabel : showLabel}
                </button>
            )}
        </div>
    );
};
