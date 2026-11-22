import {drawAnnotationLabel} from "../../../components/ui/drawAnnotationLabel.js";

const waitForMetadata = (video) => {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            cleanup();
            reject(new Error("Timed out while loading video metadata."));
        }, 10000);
        const cleanup = () => {
            window.clearTimeout(timeoutId);
            video.removeEventListener("loadedmetadata", handleLoaded);
            video.removeEventListener("error", handleError);
        };
        const handleLoaded = () => {
            cleanup();
            resolve();
        };
        const handleError = () => {
            cleanup();
            reject(new Error("The incident video could not be loaded for screenshot capture."));
        };
        video.addEventListener("loadedmetadata", handleLoaded, { once: true });
        video.addEventListener("error", handleError, { once: true });
    });
};

const waitForFrame = (video) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            cleanup();
            reject(new Error("Timed out while loading the incident video frame."));
        }, 10000);
        const cleanup = () => {
            window.clearTimeout(timeoutId);
            video.removeEventListener("loadeddata", handleLoaded);
            video.removeEventListener("error", handleError);
        };
        const handleLoaded = () => {
            cleanup();
            resolve();
        };
        const handleError = () => {
            cleanup();
            reject(new Error("The incident frame could not be decoded."));
        };
        video.addEventListener("loadeddata", handleLoaded, { once: true });
        video.addEventListener("error", handleError, { once: true });
    });
};

const seekTo = (video, time) => {
    if (Math.abs(video.currentTime - time) < 0.02) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            cleanup();
            reject(new Error("Timed out while seeking to the incident frame."));
        }, 10000);
        const cleanup = () => {
            window.clearTimeout(timeoutId);
            video.removeEventListener("seeked", handleSeeked);
            video.removeEventListener("error", handleError);
        };
        const handleSeeked = () => {
            cleanup();
            resolve();
        };
        const handleError = () => {
            cleanup();
            reject(new Error("The incident frame could not be loaded."));
        };
        video.addEventListener("seeked", handleSeeked, { once: true });
        video.addEventListener("error", handleError, { once: true });
        video.currentTime = time;
    });
};

const POSE_SKELETON_PAIRS = [
    [0, 1], [0, 2], [1, 3], [2, 4],
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
];

export const drawIncidentAnnotations = (context, frame, labels, width, options = {}) => {
    const segmentations = frame?.predictions?.segmentation ?? [];
    segmentations.forEach((item) => {
        const points = item?.polygon;
        if (!Array.isArray(points) || points.length < 3) return;
        if ((item.confidence ?? 0) < (options.segmentationConfidence ?? 0)) return;
        if (options.selectedSegmentationClasses
            && !options.selectedSegmentationClasses.includes(item.class_name)) return;
        const className = String(item.class_name ?? "").toLowerCase();
        const isAttacker = item.behaviorRole === "attacker";
        const isVictim = item.behaviorRole === "victim";
        const color = isAttacker ? "#f97316" : isVictim ? "#ef4444" : "#facc15";

        if (options.showMasks !== false) {
            context.beginPath();
            points.forEach(([x, y], index) => {
                if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return;
                if (index === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            });
            context.closePath();
            context.fillStyle = `${color}55`;
            context.fill();
            context.strokeStyle = color;
            context.lineWidth = Math.max(3, width / 240) * (options.annotationSize ?? 1);
            context.stroke();
        }

        if (className === "person") {
            const label = isAttacker
                ? labels.attacker
                : item.attackDetected ? labels.attackedVictim : isVictim ? labels.victim : "";
            if (!label) return;
            const minX = Math.min(...points.map(([x]) => Number(x)));
            const minY = Math.min(...points.map(([, y]) => Number(y)));
            const annotationSize = options.annotationSize ?? 1;
            const fontSize = Math.max(16, width / 60) * annotationSize;
            if (options.useDetectionLabelStyle) {
                drawAnnotationLabel(context, {
                    x: minX,
                    y: Math.max(0, minY - fontSize * 1.35),
                    className: options.showLabels === false ? "" : label,
                    colorClassName: className,
                    trackId: item.track_id,
                    showTrackId: options.showIds === true,
                    confidence: options.showConfidence ? Number(item.confidence ?? 0) : null,
                    fontSize,
                    padding: 6 * annotationSize,
                });
                return;
            }
            if (options.showLabels === false) return;
            context.font = `600 ${fontSize}px system-ui, sans-serif`;
            const labelWidth = context.measureText(label).width + fontSize;
            const confidenceText = options.showConfidence
                ? ` ${(Number(item.confidence ?? 0) * 100).toFixed(0)}%`
                : "";
            const idText = options.showIds && item.track_id != null ? ` ID ${item.track_id}` : "";
            const fullLabelWidth = labelWidth
                + context.measureText(confidenceText).width
                + context.measureText(idText).width;
            const labelY = Math.max(fontSize * 1.5, minY);
            context.fillStyle = color;
            context.fillRect(minX, labelY - fontSize * 1.3, fullLabelWidth, fontSize * 1.7);
            context.fillStyle = "#ffffff";
            context.fillText(label, minX + fontSize / 2, labelY);
            if (confidenceText) context.fillText(confidenceText, minX + labelWidth, labelY);
            if (idText) {
                context.fillText(idText, minX + labelWidth + context.measureText(confidenceText).width, labelY);
            }
        }
    });

    const poses = frame?.predictions?.["pose-estimation"] ?? [];
    poses.forEach((pose) => {
        if ((pose.confidence ?? 0) < (options.poseConfidence ?? 0)) return;
        const keypoints = Array.isArray(pose.keypoints) ? pose.keypoints : [];
        const pointAt = (index) => {
            const point = keypoints[index];
            if (!Array.isArray(point) || !Number.isFinite(Number(point[0]))
                || !Number.isFinite(Number(point[1]))) return null;
            if ((point[2] ?? 1) < (options.poseConfidence ?? 0)) return null;
            return [Number(point[0]), Number(point[1])];
        };
        if (options.showSkeleton !== false) {
            context.strokeStyle = "#2563eb";
            context.lineWidth = Math.max(2, width / 300) * (options.annotationSize ?? 1);
            POSE_SKELETON_PAIRS.forEach(([start, end]) => {
                if (options.selectedKeypoints
                    && (!options.selectedKeypoints.includes(start)
                        || !options.selectedKeypoints.includes(end))) return;
                const first = pointAt(start);
                const second = pointAt(end);
                if (!first || !second) return;
                context.beginPath();
                context.moveTo(first[0], first[1]);
                context.lineTo(second[0], second[1]);
                context.stroke();
            });
        }
        if (options.showKeypoints !== false) {
            context.fillStyle = "#1d4ed8";
            keypoints.forEach((_, index) => {
                if (options.selectedKeypoints && !options.selectedKeypoints.includes(index)) return;
                const point = pointAt(index);
                if (!point) return;
                context.beginPath();
                context.arc(point[0], point[1], Math.max(3, width / 220) * (options.annotationSize ?? 1), 0, Math.PI * 2);
                context.fill();
            });
        }
        const showPoseIds = options.showPoseIds ?? options.showIds;
        if (options.showLabels || options.showConfidence || showPoseIds) {
            const visiblePoints = keypoints
                .map((_, index) => pointAt(index))
                .filter(Boolean);
            if (visiblePoints.length) {
                const text = [
                    showPoseIds && pose.track_id != null ? `ID ${pose.track_id}` : "",
                    options.showConfidence ? `${(Number(pose.confidence ?? 0) * 100).toFixed(0)}%` : "",
                ].filter(Boolean).join(" ");
                if (text) {
                    const x = Math.min(...visiblePoints.map(([pointX]) => pointX));
                    const y = Math.max(16, Math.min(...visiblePoints.map(([, pointY]) => pointY)) - 6);
                    const annotationSize = options.annotationSize ?? 1;
                    const fontSize = Math.max(14, width / 70) * annotationSize;
                    if (options.useDetectionLabelStyle) {
                        drawAnnotationLabel(context, {
                            x,
                            y: Math.max(0, y - fontSize * 1.35),
                            colorClassName: "person",
                            trackId: pose.track_id,
                            showTrackId: showPoseIds === true,
                            confidence: options.showConfidence ? Number(pose.confidence ?? 0) : null,
                            fontSize,
                            padding: 6 * annotationSize,
                        });
                    } else {
                        context.font = `600 ${fontSize}px system-ui, sans-serif`;
                        context.fillStyle = "#1d4ed8";
                        context.fillText(text, x, y);
                    }
                }
            }
        }
    });
};

/**
 * Capture the first attack frame with its frontend annotations over the video.
 *
 * @param {HTMLVideoElement} video - Mounted video element used for playback.
 * @param {object} frame - Enriched incident frame.
 * @param {number|null} frameTime - Incident position in seconds, or null to capture the current live frame.
 * @param {{ attacker: string, victim: string, attackedVictim: string }} labels - Localized overlay text.
 * @param {object} [annotationOptions={}] - Options passed to the shared annotation renderer.
 * @returns {Promise<Blob>} JPEG screenshot blob.
 */
export const createIncidentScreenshot = async (video, frame, frameTime, labels, annotationOptions = {}) => {
    await waitForMetadata(video);
    const previousTime = video.currentTime;
    const wasPlaying = !video.paused;
    const seekToIncidentFrame = Number.isFinite(frameTime);
    if (seekToIncidentFrame) video.pause();

    try {
        if (seekToIncidentFrame) {
            await seekTo(video, Math.min(Math.max(frameTime, 0), video.duration || 0));
        }
        await waitForFrame(video);
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context || !canvas.width || !canvas.height) {
            throw new Error("The incident video has no capturable frame.");
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawIncidentAnnotations(context, frame, labels, canvas.width, annotationOptions);
        const blob = await new Promise((resolve, reject) => {
            try {
                canvas.toBlob((result) => (
                    result ? resolve(result) : reject(new Error("Screenshot encoding failed."))
                ), "image/jpeg", 0.9);
            } catch (error) {
                reject(error);
            }
        });
        return blob;
    } finally {
        if (seekToIncidentFrame && Number.isFinite(previousTime) && video.duration > 0) {
            await seekTo(video, Math.min(previousTime, video.duration));
        }
        if (seekToIncidentFrame && wasPlaying) void video.play().catch(() => {});
    }
};
