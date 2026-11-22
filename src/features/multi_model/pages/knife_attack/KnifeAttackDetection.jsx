import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {FixedSpinner} from "../../../../components/ui/FixedSpinner.jsx";
import {Checkbox} from "../../../../components/ui/Checkbox.jsx";
import {PredictionController} from "../../../../components/ui/PredictionController.jsx";
import {UrlInput} from "../../../../components/ui/UrlInput.jsx";
import {VideoApiResponseCard} from "../../../../components/ui/VideoApiResponseCard.jsx";
import {VideoUploader} from "../../../../components/ui/VideoUploader.jsx";
import {API_URL} from "../../../../config/settings.js";
import {useLanguage} from "../../../../context/useLanguage.js";
import {getRandomVideoUrl} from "../../../../services/mediaService.js";
import {waitForVideoJob} from "../../../../services/videoJobService.js";
import {ClassificationPageLayout} from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import {Hero} from "../../../classification/components/sections/Hero.jsx";
import {analyzeKnifeAttackFrames} from "../../utils/analyzeKnifeAttackFrames.js";
import {createIncidentScreenshot} from "../../utils/createIncidentScreenshot.js";
import {getVideoFrameTime} from "../../utils/getVideoFrameTime.js";
import {KnifeAttackVideo} from "../../components/KnifeAttackVideo.jsx";
import {SourceCards} from "../../../classification/components/sections/SourceCards.jsx";
import {KnifeAttackImage} from "../../components/KnifeAttackImage.jsx";
import {KnifeAttackWebcam} from "../../components/KnifeAttackWebcam.jsx";

const MODELS = ["instance-segmentation", "pose-estimation", "object-detection"];
const KNIFE_MODEL = "knife";
const DEFAULT_POSE_KEYPOINT_INDICES = [7, 8, 9, 10];
const PEXELS_SEARCH_TERMS = [
    "fight with a knife",
    "person attack with a knife",
    "soldier attack with knife",
    "knife attack",
    "attack other person with a knife",
];
const MODEL_OPTIONS = {
    "instance-segmentation": {
        classes: ["person"],
        tracking: true,
    },
    "pose-estimation": {
        tracking: true,
    },
};
const OBJECT_DETECTION_OPTIONS = {
    model: KNIFE_MODEL,
    tracking: true,
    tracker: "bytetrack",
};
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const VIDEO_ENDPOINT = `${API_URL}/api/multi_model/predict/video`;
const KNIFE_IMAGE_ENDPOINT = `${API_URL}/api/object_detection/predict`;

const createModelOptions = (instanceSegmentationConfidence, poseConfidence) => ({
    "instance-segmentation": {
        ...MODEL_OPTIONS["instance-segmentation"],
        conf: instanceSegmentationConfidence,
    },
    "pose-estimation": {...MODEL_OPTIONS["pose-estimation"], conf: poseConfidence},
});
const createVideoModelOptions = (instanceSegmentationConfidence, poseConfidence, knifeConfidence) => JSON.stringify({
    ...createModelOptions(instanceSegmentationConfidence, poseConfidence),
    "object-detection": {...OBJECT_DETECTION_OPTIONS, conf: knifeConfidence},
});

const RecipientEmailInput = ({email, value, onChange}) => (
    <div className="flex w-full flex-col items-center text-center">
        <label htmlFor="knife-attack-recipient"
               className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
            {email.recipientLabel}
        </label>
        <input
            id="knife-attack-recipient"
            type="email"
            autoComplete="email"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={email.recipientPlaceholder}
            className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
    </div>
);

const readVideoResponse = async (response, labels) => {
    const body = await response.json().catch(() => null);
    if (!response.ok) {
        const detail = Array.isArray(body?.detail)
            ? body.detail.map((item) => item.msg).join(", ")
            : body?.detail;
        throw new Error(detail || `${labels.requestError} (${response.status})`);
    }
    return body;
};

const readKnifeDetections = async (response, labels) => {
    const body = await readVideoResponse(response, labels);
    if (!Array.isArray(body)) throw new Error(labels.invalidResponse);
    return body;
};

const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
};

const getFrameStatus = (frame, labels) => {
    if (frame?.behavior?.attackDetected) return labels.attackedVictim;
    if (frame?.behavior?.attackerTrackId != null) return labels.attackerIdentified;
    return labels.noRoles;
};

export const KnifeAttackDetection = ({model}) => {
    const {t} = useLanguage();
    const [activeSourceId, setActiveSourceId] = useState("video");
    const [videoUrl, setVideoUrl] = useState("");
    const [videoFile, setVideoFile] = useState(null);
    const [videoSource, setVideoSource] = useState("");
    const [frames, setFrames] = useState(null);
    const [currentFrame, setCurrentFrame] = useState(null);
    const [recipient, setRecipient] = useState("");
    const [emailText, setEmailText] = useState("");
    const [screenshotBlob, setScreenshotBlob] = useState(null);
    const [screenshotEventKey, setScreenshotEventKey] = useState("");
    const [screenshotUrl, setScreenshotUrl] = useState("");
    const [requestError, setRequestError] = useState("");
    const [screenshotError, setScreenshotError] = useState("");
    const [mailError, setMailError] = useState("");
    const [mailStatus, setMailStatus] = useState("");
    const [mailSending, setMailSending] = useState(false);
    const [isPredicting, setIsPredicting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [syncEnabled, setSyncEnabled] = useState(false);
    const [instanceSegmentationConfidence, setInstanceSegmentationConfidence] = useState(0.5);
    const [poseConfidence, setPoseConfidence] = useState(0.5);
    const [selectedInstanceSegmentationClasses, setSelectedInstanceSegmentationClasses] = useState(["person", "knife"]);
    const [selectedKeypoints, setSelectedKeypoints] = useState(() => [...DEFAULT_POSE_KEYPOINT_INDICES]);
    const [showMasks, setShowMasks] = useState(true);
    const [showKeypoints, setShowKeypoints] = useState(true);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [showConfidence, setShowConfidence] = useState(false);
    const [showIds, setShowIds] = useState(true);
    const [annotationSize, setAnnotationSize] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [knifeConfidence, setKnifeConfidence] = useState(0.5);
    const imageModelOptions = useMemo(
        () => JSON.stringify({
            ...createModelOptions(instanceSegmentationConfidence, poseConfidence),
            "object-detection": {model: KNIFE_MODEL, conf: knifeConfidence},
        }),
        [instanceSegmentationConfidence, knifeConfidence, poseConfidence],
    );
    const webcamModelOptions = useMemo(
        () => JSON.stringify(createModelOptions(instanceSegmentationConfidence, poseConfidence)),
        [instanceSegmentationConfidence, poseConfidence],
    );
    const videoModelOptions = useMemo(
        () => createVideoModelOptions(instanceSegmentationConfidence, poseConfidence, knifeConfidence),
        [instanceSegmentationConfidence, knifeConfidence, poseConfidence],
    );
    const videoRef = useRef(null);
    const playerContainerRef = useRef(null);
    const fileVideoUrlRef = useRef("");
    const videoFileRef = useRef(null);
    const mailAttemptedRef = useRef("");
    const mailInFlightRef = useRef(false);
    const webcamIncidentCaptureKeyRef = useRef("");
    const fetchKnifeImageDetections = useCallback(async (source, confidence, signal) => {
        const params = new URLSearchParams({
            model: KNIFE_MODEL,
            conf: String(confidence),
        });
        let response;
        if (typeof source === "string") {
            params.set("source", source);
            response = await fetch(`${KNIFE_IMAGE_ENDPOINT}?${params.toString()}`, {signal});
        } else {
            const formData = new FormData();
            formData.append("source", source, source.name ?? "knife-frame.jpg");
            response = await fetch(`${KNIFE_IMAGE_ENDPOINT}?${params.toString()}`, {
                method: "POST",
                body: formData,
                signal,
            });
        }
        return readKnifeDetections(response, model.videoLabels);
    }, [model.videoLabels]);
    const attackEvent = useMemo(() => {
        if (!Array.isArray(frames)) return null;
        const index = frames.findIndex((frame) => frame?.behavior?.attackDetected);
        return index >= 0 ? {frame: frames[index], index} : null;
    }, [frames]);
    const webcamAttackEvent = activeSourceId === "webcam" && currentFrame?.behavior?.attackDetected
        ? {frame: currentFrame, index: currentFrame.behavior.frameIndex ?? 0}
        : null;
    const incidentEvent = activeSourceId === "webcam" ? webcamAttackEvent
        : activeSourceId === "video" ? attackEvent : null;
    const incidentEventKey = incidentEvent
        ? activeSourceId === "webcam"
            ? `webcam:${incidentEvent.frame.behavior.attackerTrackId ?? "unknown"}:${incidentEvent.frame.behavior.attackedVictimTrackIds?.join(",") || "unknown"}`
            : `${videoSource}:${incidentEvent.frame.frame_index ?? incidentEvent.index}`
        : "";
    const incidentEventRef = useRef(null);
    incidentEventRef.current = incidentEvent;
    const screenshotLabels = useMemo(() => ({
        attacker: model.email.possibleAttacker,
        victim: model.email.possibleVictim,
        attackedVictim: model.email.attackDetected,
    }), [model.email]);
    const roleLabels = useMemo(() => ({
        attacker: model.imageLabels.attacker,
        victim: model.imageLabels.potentialVictim,
        attackedVictim: model.imageLabels.potentialVictim,
    }), [model.imageLabels.attacker, model.imageLabels.potentialVictim]);
    const videoLabels = useMemo(() => ({
        ...roleLabels,
        videoAlt: model.videoLabels.videoAlt,
    }), [model.videoLabels.videoAlt, roleLabels]);
    const instanceSegmentationCounts = useMemo(() => {
        const instances = currentFrame?.predictions?.["instance-segmentation"];
        if (!Array.isArray(instances)) return {};
        return instances.reduce((counts, item) => {
            if (item.class_name) counts[item.class_name] = (counts[item.class_name] ?? 0) + 1;
            return counts;
        }, {});
    }, [currentFrame]);
    const annotationOptions = useMemo(() => ({
        instanceSegmentationConfidence,
        poseConfidence,
        knifeConfidence,
        selectedInstanceSegmentationClasses,
        selectedKeypoints,
        showMasks,
        showKeypoints,
        showSkeleton,
        showLabels,
        showConfidence,
        showIds,
        annotationSize,
    }), [
        annotationSize,
        knifeConfidence,
        poseConfidence,
        selectedKeypoints,
        selectedInstanceSegmentationClasses,
        instanceSegmentationConfidence,
        showConfidence,
        showKeypoints,
        showLabels,
        showMasks,
        showIds,
        showSkeleton,
    ]);
    const modelSections = useMemo(() => ([
        {
            id: "instance-segmentation",
            title: model.videoLabels.instanceSegmentationModel,
            content: (
                <div className="space-y-2">
                    {["person", "knife"].map((className) => (
                        <Checkbox
                            key={className}
                            checked={selectedInstanceSegmentationClasses.includes(className)}
                            onChange={(event) => setSelectedInstanceSegmentationClasses((current) => (
                                event.target.checked
                                    ? [...current, className]
                                    : current.filter((value) => value !== className)
                            ))}
                        >
                            <span className="flex-1">{className}</span>
                            <span aria-live="polite" className="tabular-nums">
                                {instanceSegmentationCounts[className] ?? 0}
                            </span>
                        </Checkbox>
                    ))}
                </div>
            ),
        },
        {
            id: "pose-estimation",
            title: model.videoLabels.poseModel,
            content: (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
                    {(model.videoLabels.keypoints ?? []).map((keypoint, index) => (
                        <Checkbox
                            key={keypoint}
                            checked={selectedKeypoints.includes(index)}
                            onChange={(event) => setSelectedKeypoints((current) => (
                                event.target.checked
                                    ? [...current, index]
                                    : current.filter((value) => value !== index)
                            ))}
                        >
                            <span className="flex-1">{keypoint}</span>
                        </Checkbox>
                    ))}
                </div>
            ),
        },
        {
            id: "frame-summary",
            title: model.videoLabels.currentFrame,
            content: (
                <div className="text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                        {getFrameStatus(currentFrame, model.videoLabels)}
                    </p>
                    {currentFrame?.behavior?.attackerTrackId != null ? (
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            {model.videoLabels.attacker}: {currentFrame.behavior.attackerTrackId}
                        </p>
                    ) : null}
                    {currentFrame?.behavior?.victimTrackIds?.length ? (
                        <p className="mt-1 text-gray-600 dark:text-gray-400">
                            {model.videoLabels.victims}: {currentFrame.behavior.victimTrackIds.join(", ")}
                        </p>
                    ) : null}
                    {currentFrame?.frame_index != null ? (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {model.email.frameLabel}: {currentFrame.frame_index}
                        </p>
                    ) : null}
                </div>
            ),
        },
    ]), [
        currentFrame,
        model.email.frameLabel,
        model.videoLabels,
        instanceSegmentationCounts,
        selectedKeypoints,
        selectedInstanceSegmentationClasses,
    ]);
    const imageModelSections = useMemo(
        () => modelSections.filter((section) => section.id !== "frame-summary"),
        [modelSections],
    );
    const annotationControllerOptions = useMemo(() => ([
        {id: "labels", label: t("image.labels"), checked: showLabels, onChange: setShowLabels},
        {id: "confidence", label: t("image.confidence"), checked: showConfidence, onChange: setShowConfidence},
        {id: "masks", label: t("image.masks"), checked: showMasks, onChange: setShowMasks},
        {id: "keypoints", label: t("image.keypoints"), checked: showKeypoints, onChange: setShowKeypoints},
        {id: "skeleton", label: t("image.skeleton"), checked: showSkeleton, onChange: setShowSkeleton},
        {id: "object-ids", label: t("ui.objectIds"), checked: showIds, onChange: setShowIds},
    ]), [showConfidence, showIds, showKeypoints, showLabels, showMasks, showSkeleton, t]);
    const videoQueryParams = useMemo(() => ({
        models: MODELS,
        model_options: videoModelOptions,
    }), [videoModelOptions]);
    const validateVideoFile = useCallback((file) => {
        const supportedTypes = ["video/mp4", "video/webm", "video/ogg"];
        const supportedExtension = /\.(mp4|webm|ogv|ogg)$/i.test(file.name);
        return supportedTypes.includes(file.type)
        || ((!file.type || file.type === "application/octet-stream") && supportedExtension)
            ? ""
            : model.videoLabels.invalidFileType;
    }, [model.videoLabels.invalidFileType]);
    const validateVideoUrl = useCallback((url) => (
        ["http:", "https:"].includes(url.protocol)
            ? ""
            : model.videoLabels.invalidUrlProtocol
    ), [model.videoLabels.invalidUrlProtocol]);

    const resetResults = useCallback(() => {
        setFrames(null);
        setCurrentFrame(null);
        setEmailText("");
        setScreenshotBlob(null);
        setScreenshotEventKey("");
        setScreenshotError("");
        setScreenshotUrl("");
        setMailError("");
        setMailStatus("");
        mailAttemptedRef.current = "";
        webcamIncidentCaptureKeyRef.current = "";
    }, []);

    const handleVideoFileChange = useCallback((file) => {
        if (fileVideoUrlRef.current) URL.revokeObjectURL(fileVideoUrlRef.current);
        const nextUrl = file ? URL.createObjectURL(file) : "";
        fileVideoUrlRef.current = nextUrl;
        videoFileRef.current = file;
        setVideoFile(file);
        setVideoUrl("");
        setVideoSource(nextUrl);
        setRequestError("");
        resetResults();
    }, [resetResults]);

    useEffect(() => () => {
        if (fileVideoUrlRef.current) URL.revokeObjectURL(fileVideoUrlRef.current);
    }, []);

    useEffect(() => {
        if (!screenshotUrl) return undefined;
        return () => URL.revokeObjectURL(screenshotUrl);
    }, [screenshotUrl]);

    const handlePredictionStart = useCallback(() => {
        setRequestError("");
        setProgress(0);
        resetResults();
    }, [resetResults]);

    const handleResult = useCallback((result, source) => {
        if (!Array.isArray(result)) {
            setRequestError(model.videoLabels.invalidResponse);
            return;
        }
        const enrichedFrames = analyzeKnifeAttackFrames(result, {
            requireKnifeOverlapForAttacker: true,
        });
        setFrames(enrichedFrames);
        setCurrentFrame(enrichedFrames[0] ?? null);
        setVideoSource(source instanceof File ? fileVideoUrlRef.current : source ?? fileVideoUrlRef.current);
    }, [model.videoLabels.invalidResponse]);

    const handleVideoError = useCallback(() => {
        setRequestError(model.videoLabels.videoLoadError);
    }, [model.videoLabels.videoLoadError]);

    const handleRecipientChange = useCallback((value) => {
        setRecipient(value);
        setMailError("");
    }, []);

    const handleMailSend = useCallback(async (allowRetry = false) => {
        if (!incidentEventRef.current || !incidentEventKey || !screenshotBlob
            || screenshotEventKey !== incidentEventKey || !emailText || mailInFlightRef.current) return;
        const address = recipient.trim();
        if (!EMAIL_PATTERN.test(address)) {
            setMailError(model.email.invalidRecipient);
            return;
        }
        const eventKey = incidentEventKey;
        if (!allowRetry && mailAttemptedRef.current === eventKey) return;

        mailAttemptedRef.current = eventKey;
        mailInFlightRef.current = true;
        setMailSending(true);
        setMailError("");
        setMailStatus("");
        try {
            const formData = new FormData();
            formData.append("to", address);
            formData.append("text", emailText);
            formData.append("image", screenshotBlob, "knife-attack-frame.jpg");
            const response = await fetch(`${API_URL}/api/mail/send`, {
                method: "POST",
                body: formData,
            });
            const body = await response.json().catch(() => null);
            if (!response.ok) {
                const detail = Array.isArray(body?.detail)
                    ? body.detail.map((item) => item.msg).join(", ")
                    : body?.detail;
                throw new Error(detail || body?.message || model.email.sendError);
            }
            if (body?.sent !== true) throw new Error(body?.message || model.email.sendError);
            setMailStatus(body.message || model.email.sent);
        } catch (error) {
            setMailError(error.message || model.email.sendError);
        } finally {
            mailInFlightRef.current = false;
            setMailSending(false);
        }
    }, [emailText, incidentEventKey, model.email, recipient, screenshotBlob, screenshotEventKey]);

    useEffect(() => {
        if (!mailSending && incidentEventKey && screenshotEventKey === incidentEventKey
            && screenshotBlob && recipient.trim()) void handleMailSend();
    }, [handleMailSend, incidentEventKey, mailSending, recipient, screenshotBlob, screenshotEventKey]);

    useEffect(() => {
        const activeIncident = incidentEventRef.current;
        const isWebcamIncident = activeSourceId === "webcam";
        if (!activeIncident || !incidentEventKey || (!isWebcamIncident && !videoSource)) {
            if (isWebcamIncident) webcamIncidentCaptureKeyRef.current = "";
            return undefined;
        }
        if (isWebcamIncident) {
            if (webcamIncidentCaptureKeyRef.current === incidentEventKey) return undefined;
            webcamIncidentCaptureKeyRef.current = incidentEventKey;
        }
        let cancelled = false;
        const video = videoRef.current;
        if (!video) return undefined;
        const timestamp = isWebcamIncident ? null : activeIncident.frame?.timestamp_ms != null
            ? Number(activeIncident.frame.timestamp_ms) / 1000
            : getVideoFrameTime(frames, activeIncident.index, video.duration);
        const body = isWebcamIncident
            ? model.email.webcamIncidentBody
            : model.email.incidentBody.replace("{time}", formatTime(timestamp));
        const frameLabel = isWebcamIncident
            ? ""
            : `\n${model.email.frameLabel}: ${activeIncident.frame.frame_index ?? activeIncident.index}`;
        setEmailText(`${model.email.incidentSubject}\n\n${body}${frameLabel}`);
        setScreenshotError("");
        setMailError("");
        setMailStatus("");
        setScreenshotBlob(null);
        setScreenshotEventKey("");
        setScreenshotUrl("");

        const capture = async () => {
            try {
                const screenshot = await createIncidentScreenshot(
                    video,
                    activeIncident.frame,
                    timestamp,
                    isWebcamIncident ? roleLabels : screenshotLabels,
                    isWebcamIncident ? {showPoseIds: false, useDetectionLabelStyle: true} : undefined,
                );
                if (cancelled) return;
                setScreenshotBlob(screenshot);
                setScreenshotEventKey(incidentEventKey);
                setScreenshotUrl(URL.createObjectURL(screenshot));
            } catch (error) {
                if (cancelled) return;
                const message = isWebcamIncident
                    ? model.email.webcamCaptureError
                    : model.email.captureError;
                setScreenshotError(`${message} ${error.message}`);
            }
        };
        void capture();
        return () => {
            cancelled = true;
        };
    }, [
        activeSourceId,
        frames,
        incidentEventKey,
        model.email,
        roleLabels,
        screenshotLabels,
        videoSource,
    ]);

    const handleUrlPredictionStart = useCallback(() => {
        handlePredictionStart();
        if (fileVideoUrlRef.current) URL.revokeObjectURL(fileVideoUrlRef.current);
        fileVideoUrlRef.current = "";
        videoFileRef.current = null;
        setVideoFile(null);
        setVideoSource("");
    }, [handlePredictionStart]);

    const rerunVideoPrediction = useCallback(async (nextModelOptions = videoModelOptions) => {
        if (!videoSource || (!videoFile && !videoUrl)) return;
        handlePredictionStart();
        setIsPredicting(true);
        try {
            let multiModelRequest;
            if (videoFile) {
                const formData = new FormData();
                formData.append("source", videoFile);
                MODELS.forEach((selectedModel) => formData.append("models", selectedModel));
                formData.append("model_options", nextModelOptions);
                multiModelRequest = fetch(VIDEO_ENDPOINT, {method: "POST", body: formData});
            } else {
                const params = new URLSearchParams({source: videoUrl, model_options: nextModelOptions});
                MODELS.forEach((selectedModel) => params.append("models", selectedModel));
                multiModelRequest = fetch(`${VIDEO_ENDPOINT}?${params.toString()}`);
            }
            const response = await multiModelRequest;
            const body = await readVideoResponse(response, model.videoLabels);
            const frames = body?.job_id
                ? await waitForVideoJob(VIDEO_ENDPOINT, body.job_id, setProgress)
                : body;
            handleResult(frames, videoFile ?? videoUrl);
        } catch (error) {
            setRequestError(error.message || model.videoLabels.requestError);
        } finally {
            setIsPredicting(false);
        }
    }, [
        handlePredictionStart,
        handleResult,
        model.videoLabels,
        videoModelOptions,
        videoFile,
        videoSource,
        videoUrl,
    ]);

    const handleConfidenceThresholdChange = useCallback((modelId, value) => {
        const nextInstanceSegmentationConfidence = modelId === "instance-segmentation"
            ? value
            : instanceSegmentationConfidence;
        const nextPoseConfidence = modelId === "pose-estimation" ? value : poseConfidence;
        const nextKnifeConfidence = modelId === "knife-detection" ? value : knifeConfidence;
        if (modelId === "instance-segmentation") setInstanceSegmentationConfidence(value);
        if (modelId === "pose-estimation") setPoseConfidence(value);
        if (modelId === "knife-detection") setKnifeConfidence(value);
        if (activeSourceId === "video" && videoSource && Array.isArray(frames)) {
            void rerunVideoPrediction(
                createVideoModelOptions(nextInstanceSegmentationConfidence, nextPoseConfidence, nextKnifeConfidence),
            );
        }
    }, [
        activeSourceId,
        frames,
        knifeConfidence,
        poseConfidence,
        rerunVideoPrediction,
        instanceSegmentationConfidence,
        videoSource,
    ]);
    const confidenceThresholds = useMemo(() => ([
        {
            id: "instance-segmentation",
            label: model.videoLabels.instanceSegmentationConfidence,
            value: instanceSegmentationConfidence,
            onChange: (value) => handleConfidenceThresholdChange("instance-segmentation", value),
        },
        {
            id: "pose-estimation",
            label: model.videoLabels.poseConfidence,
            value: poseConfidence,
            onChange: (value) => handleConfidenceThresholdChange("pose-estimation", value),
        },
        {
            id: "knife-detection",
            label: model.videoLabels.knifeConfidence,
            value: knifeConfidence,
            onChange: (value) => handleConfidenceThresholdChange("knife-detection", value),
        },
    ]), [
        handleConfidenceThresholdChange,
        knifeConfidence,
        model.videoLabels.poseConfidence,
        model.videoLabels.knifeConfidence,
        model.videoLabels.instanceSegmentationConfidence,
        poseConfidence,
        instanceSegmentationConfidence,
    ]);

    const selectFrame = useCallback((frame, index) => {
        const video = videoRef.current;
        if (video && video.duration > 0) {
            video.currentTime = getVideoFrameTime(frames ?? [], index, video.duration);
        }
        setCurrentFrame(frame);
    }, [frames]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === playerContainerRef.current);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }
        await playerContainerRef.current?.requestFullscreen();
    }, []);
    const sourcePredictionControllerProps = useMemo(() => ({
        containerRef: playerContainerRef,
        isFullscreen,
        onToggleFullscreen: toggleFullscreen,
        modelSections: imageModelSections,
        confidenceThresholds,
        annotationOptions: annotationControllerOptions,
        annotationSize,
        onAnnotationSizeChange: setAnnotationSize,
    }), [
        annotationControllerOptions,
        annotationSize,
        confidenceThresholds,
        imageModelSections,
        isFullscreen,
        toggleFullscreen,
    ]);

    const sendFields = useMemo(() => ({
        models: MODELS,
        model_options: videoModelOptions,
    }), [videoModelOptions]);
    const handleUploadedVideoResult = useCallback((result) => {
        handleResult(result, videoFileRef.current);
    }, [handleResult]);
    const sources = ["image", "video", "webcam"].map((id) => ({
        id,
        name: model.mode[id].name,
        description: model.mode[id].description,
    }));

    return (
        <ClassificationPageLayout>
            <Hero {...model.hero} />
            <SourceCards
                sources={sources}
                selectedSourceId={activeSourceId}
                onSelect={(sourceId) => {
                    setActiveSourceId(sourceId);
                    setCurrentFrame(null);
                }}
            />
            {activeSourceId === "image" ? (
                <KnifeAttackImage
                    model={model}
                    searchTerms={PEXELS_SEARCH_TERMS}
                    roleLabels={roleLabels}
                    onFrameChange={setCurrentFrame}
                    annotationOptions={annotationOptions}
                    modelOptions={imageModelOptions}
                    predictionController={sourcePredictionControllerProps}
                />
            ) : null}
            {activeSourceId === "webcam" ? (
                <div className="space-y-4">
                    <RecipientEmailInput
                        email={model.email}
                        value={recipient}
                        onChange={handleRecipientChange}
                    />
                    <KnifeAttackWebcam
                        model={model}
                        mediaRef={videoRef}
                        roleLabels={roleLabels}
                        onFrameChange={setCurrentFrame}
                        annotationOptions={annotationOptions}
                        modelOptions={webcamModelOptions}
                        fetchKnifeDetections={fetchKnifeImageDetections}
                        predictionController={sourcePredictionControllerProps}
                    />
                </div>
            ) : null}
            {activeSourceId === "video" ? (
                <>
                    <section
                        className="relative space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <FixedSpinner
                            loading={isPredicting}
                            message={model.videoLabels.processing}
                            progress={progress}
                        />
                        <RecipientEmailInput
                            email={model.email}
                            value={recipient}
                            onChange={handleRecipientChange}
                        />
                        <div className="flex flex-col items-center gap-4">
                            <VideoUploader
                                label={model.mode.video.uploadLabel}
                                buttonText={model.mode.video.chooseVideo}
                                endpoint={VIDEO_ENDPOINT}
                                fieldName="source"
                                formFields={sendFields}
                                validateFile={validateVideoFile}
                                loadingLabel={model.videoLabels.processing}
                                video={videoFile}
                                ariaLabel={model.mode.video.uploadLabel}
                                disabled={isPredicting}
                                onVideoChange={handleVideoFileChange}
                                onPredictionStart={handlePredictionStart}
                                onResult={handleUploadedVideoResult}
                                onError={setRequestError}
                                onLoadingChange={setIsPredicting}
                                onProgressChange={setProgress}
                            />
                            <UrlInput
                                label={model.videoUrlInput.label}
                                buttonText={model.videoUrlInput.buttonText}
                                placeholder={model.videoUrlInput.placeholder}
                                imgUrl={videoUrl}
                                setImgUrl={setVideoUrl}
                                endpoint={VIDEO_ENDPOINT}
                                queryParamName="source"
                                queryParams={videoQueryParams}
                                inputId="knife-attack-video-url"
                                mediaType="video"
                                validateUrl={validateVideoUrl}
                                loadingLabel={model.videoLabels.processing}
                                disabled={isPredicting}
                                onResult={handleResult}
                                onPredictionStart={handleUrlPredictionStart}
                                onLoadingChange={setIsPredicting}
                                onProgressChange={setProgress}
                                exampleLabel={t("ui.randomVideo")}
                                exampleLoadingLabel={t("ui.loadingRandomVideo")}
                                onExampleClick={() => getRandomVideoUrl(model, PEXELS_SEARCH_TERMS)}
                            />
                        </div>
                        {requestError ? <p role="alert"
                                           className="text-sm text-red-600 dark:text-red-400">{requestError}</p> : null}
                    </section>

                    {videoSource ? (
                        <PredictionController
                            containerRef={playerContainerRef}
                            isFullscreen={isFullscreen}
                            onToggleFullscreen={toggleFullscreen}
                            className={`rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${isPredicting ? "pointer-events-none select-none opacity-60 blur-sm" : ""} lg:grid-cols-[minmax(0,1fr)_20rem]`}
                            modelSections={modelSections}
                            confidenceThresholds={confidenceThresholds}
                            annotationOptions={annotationControllerOptions}
                            annotationSize={annotationSize}
                            onAnnotationSizeChange={setAnnotationSize}
                            media={(
                                <div className="relative min-w-0">
                                    {currentFrame?.behavior?.attackDetected ? (
                                        <p role="status"
                                           className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                                            {model.email.attackDetected}
                                        </p>
                                    ) : null}
                                    <KnifeAttackVideo
                                        videoSource={videoSource}
                                        frames={frames ?? []}
                                        currentFrame={currentFrame}
                                        onCurrentFrameChange={setCurrentFrame}
                                        videoRef={videoRef}
                                        labels={videoLabels}
                                        onVideoError={handleVideoError}
                                        annotationOptions={annotationOptions}
                                        annotationsEnabled
                                        isFullscreen={isFullscreen}
                                        onToggleFullscreen={toggleFullscreen}
                                    />
                                </div>
                            )}
                        />
                    ) : null}

                    {Array.isArray(frames) ? (
                        <VideoApiResponseCard
                            frames={frames}
                            currentFrame={currentFrame}
                            onSelectFrame={selectFrame}
                            videoRef={videoRef}
                            syncEnabled={syncEnabled}
                            onSyncChange={(event) => setSyncEnabled(event.target.checked)}
                            apiResponseLabel={t("ui.apiResponse")}
                            apiResponseTooltip={model.videoLabels.responseTooltip}
                            syncLabel={t("ui.syncVideoFrame")}
                        />
                    ) : null}
                </>
            ) : null}
            {incidentEventKey ? (
                <section
                    className="space-y-4 rounded-3xl border border-amber-300 bg-amber-50 p-6 shadow-sm dark:border-amber-800 dark:bg-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{model.email.emailPreviewTitle}</h2>
                    {screenshotUrl ? (
                        <img
                            src={screenshotUrl}
                            alt={model.email.screenshotAlt}
                            className="max-h-[32rem] w-auto max-w-full rounded-xl border border-gray-300 dark:border-gray-600"
                        />
                    ) : null}
                    <pre
                        className="whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                        {emailText}
                    </pre>
                    {screenshotError ? <p role="alert"
                                          className="text-sm text-red-600 dark:text-red-400">{screenshotError}</p> : null}
                    {mailSending ? <p role="status"
                                      className="text-sm text-blue-700 dark:text-blue-300">{model.email.sending}</p> : null}
                    {mailStatus ? <p role="status"
                                     className="text-sm text-green-700 dark:text-green-300">{mailStatus}</p> : null}
                    {mailError ? (
                        <div className="flex flex-wrap items-center gap-3">
                            <p role="alert" className="text-sm text-red-600 dark:text-red-400">{mailError}</p>
                            {screenshotBlob && screenshotEventKey === incidentEventKey
                                && EMAIL_PATTERN.test(recipient.trim()) ? (
                                    <button
                                        type="button"
                                        onClick={() => void handleMailSend(true)}
                                        disabled={mailSending}
                                        className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {model.email.retry}
                                    </button>
                                ) : null}
                        </div>
                    ) : null}
                </section>
            ) : null}
        </ClassificationPageLayout>
    );
};
