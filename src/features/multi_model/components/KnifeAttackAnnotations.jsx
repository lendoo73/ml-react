import {useEffect, useRef} from "react";
import {drawIncidentAnnotations} from "../utils/createIncidentScreenshot.js";

const DEFAULT_ANNOTATION_OPTIONS = {
    segmentationConfidence: 0.25,
    poseConfidence: 0.25,
    selectedSegmentationClasses: ["person", "knife"],
    showMasks: true,
    showKeypoints: true,
    showSkeleton: true,
    showLabels: true,
    showConfidence: true,
    showIds: true,
};

export const KnifeAttackAnnotations = ({
                                           mediaRef,
                                           frame,
                                           labels,
                                           annotationOptions = DEFAULT_ANNOTATION_OPTIONS,
                                           mediaLoaded = true,
                                       }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const media = mediaRef.current;
        const canvas = canvasRef.current;
        if (!mediaLoaded || !media || !canvas) return;

        const width = media.videoWidth || media.naturalWidth;
        const height = media.videoHeight || media.naturalHeight;
        if (!width || !height) return;

        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) return;

        drawIncidentAnnotations(context, frame, labels, width, annotationOptions);
    }, [annotationOptions, frame, labels, mediaLoaded, mediaRef]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
        />
    );
};
