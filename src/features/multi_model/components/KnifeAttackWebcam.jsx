import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {PredictionController} from "../../../components/ui/PredictionController.jsx";
import {API_URL} from "../../../config/settings.js";
import {useLanguage} from "../../../context/useLanguage.js";
import {
    analyzeKnifeAttackFrames,
    MAX_MISSED_KNIFE_FRAMES,
} from "../utils/analyzeKnifeAttackFrames.js";
import {KnifeAttackAnnotations} from "./KnifeAttackAnnotations.jsx";

const IMAGE_ENDPOINT = `${API_URL}/api/multi_model/predict`;
const MODELS = ["instance-segmentation", "pose-estimation"];
const FRAME_INTERVAL_MS = 1000;

export const KnifeAttackWebcam = ({
                                      model,
                                      mediaRef,
                                      roleLabels,
                                      onFrameChange,
                                      predictionController,
                                      annotationOptions,
                                      modelOptions,
                                      fetchKnifeDetections,
                                  }) => {
    const {t} = useLanguage();
    const internalVideoRef = useRef(null);
    const videoRef = mediaRef ?? internalVideoRef;
    const captureRef = useRef(null);
    const frameHistoryRef = useRef([]);
    const streamRef = useRef(null);
    const requestRef = useRef(null);
    const requestControllerRef = useRef(null);
    const isRequestPendingRef = useRef(false);
    const [stream, setStream] = useState(null);
    const [frame, setFrame] = useState(null);
    const [error, setError] = useState("");
    const [isStarting, setIsStarting] = useState(false);
    const webcamAnnotationOptions = useMemo(() => ({
        ...annotationOptions,
        showPoseIds: false,
    }), [annotationOptions]);

    const stopWebcam = useCallback(() => {
        clearInterval(requestRef.current);
        requestRef.current = null;
        requestControllerRef.current?.abort();
        requestControllerRef.current = null;
        frameHistoryRef.current = [];
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setStream(null);
        setFrame(null);
        onFrameChange(null);
        setIsStarting(false);
    }, [onFrameChange, videoRef]);

    const startWebcam = useCallback(async () => {
        setError("");
        frameHistoryRef.current = [];
        setFrame(null);
        onFrameChange(null);
        setIsStarting(true);
        let nextStream;
        try {
            nextStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
            streamRef.current = nextStream;
            if (videoRef.current) videoRef.current.srcObject = nextStream;
            setStream(nextStream);
            setIsStarting(false);
        } catch (startError) {
            nextStream?.getTracks().forEach((track) => track.stop());
            setError(startError.message || t("ui.webcamAccessError"));
            setIsStarting(false);
        }
    }, [onFrameChange, t, videoRef]);

    useEffect(() => {
        const video = videoRef.current;
        if (!stream || !video) return undefined;
        video.srcObject = stream;

        const sendFrame = async () => {
            if (
                isRequestPendingRef.current
                || streamRef.current !== stream
                || video.readyState < 2
            ) return;
            const canvas = captureRef.current;
            if (!canvas) return;
            isRequestPendingRef.current = true;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d")?.drawImage(video, 0, 0);

            try {
                const blob = await new Promise((resolve, reject) => {
                    canvas.toBlob((result) => (
                        result ? resolve(result) : reject(new Error(model.imageLabels.captureError))
                    ), "image/jpeg", 0.8);
                });
                const formData = new FormData();
                formData.append("source", blob, "webcam-frame.jpg");
                MODELS.forEach((selectedModel) => formData.append("models", selectedModel));
                formData.append("model_options", modelOptions);
                if (streamRef.current !== stream) return;
                const controller = new AbortController();
                requestControllerRef.current = controller;
                const [response, knifeDetections] = await Promise.all([
                    fetch(IMAGE_ENDPOINT, {
                        method: "POST",
                        body: formData,
                        signal: controller.signal,
                    }),
                    fetchKnifeDetections(
                        blob,
                        annotationOptions.knifeConfidence,
                        controller.signal,
                    ),
                ]);
                const body = await response.json().catch(() => null);
                if (!response.ok) {
                    const detail = Array.isArray(body?.detail)
                        ? body.detail.map((item) => item.msg).join(", ")
                        : body?.detail;
                    throw new Error(detail || `${model.imageLabels.requestError} (${response.status})`);
                }
                if (!body?.predictions || typeof body.predictions !== "object") {
                    throw new Error(model.imageLabels.invalidResponse);
                }
                if (streamRef.current === stream) {
                    const rawFrame = {
                        predictions: {...body.predictions, knife: knifeDetections},
                    };
                    frameHistoryRef.current = [
                        ...frameHistoryRef.current,
                        rawFrame,
                    ].slice(-(MAX_MISSED_KNIFE_FRAMES + 1));
                    const analyzedFrames = analyzeKnifeAttackFrames(frameHistoryRef.current, {
                        requireKnifeOverlapForAttacker: true,
                    });
                    const nextFrame = analyzedFrames[analyzedFrames.length - 1];
                    setFrame(nextFrame);
                    onFrameChange(nextFrame);
                    setError("");
                }
            } catch (requestError) {
                if (requestError.name !== "AbortError" && streamRef.current === stream) {
                    setError(requestError.message || model.imageLabels.requestError);
                }
            } finally {
                requestControllerRef.current = null;
                isRequestPendingRef.current = false;
            }
        };

        requestRef.current = window.setInterval(() => void sendFrame(), FRAME_INTERVAL_MS);
        void sendFrame();
        return () => {
            clearInterval(requestRef.current);
            requestRef.current = null;
            requestControllerRef.current?.abort();
            requestControllerRef.current = null;
        };
    }, [
        model.email,
        model.imageLabels.captureError,
        model.imageLabels.invalidResponse,
        model.imageLabels.requestError,
        annotationOptions.knifeConfidence,
        fetchKnifeDetections,
        modelOptions,
        onFrameChange,
        stream,
        videoRef,
    ]);

    useEffect(() => () => {
        clearInterval(requestRef.current);
        requestControllerRef.current?.abort();
        frameHistoryRef.current = [];
        streamRef.current?.getTracks().forEach((track) => track.stop());
    }, []);

    return (
        <section
            className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <PredictionController
                {...predictionController}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:grid-cols-[minmax(0,1fr)_20rem]"
                media={(
                    <div className="relative mx-auto w-full overflow-hidden rounded-2xl bg-black">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="block h-auto max-h-[70vh] w-full object-contain"
                            aria-label={model.imageLabels.webcamAlt}
                        />
                        <KnifeAttackAnnotations
                            mediaRef={videoRef}
                            frame={frame}
                            labels={roleLabels ?? model.email}
                            annotationOptions={webcamAnnotationOptions}
                            useDetectionLabelStyle
                        />
                    </div>
                )}
            />
            <canvas ref={captureRef} className="hidden"/>
            <button
                type="button"
                onClick={stream ? stopWebcam : () => void startWebcam()}
                disabled={isStarting}
                className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
                {stream || isStarting ? t("ui.webcamStop") : t("ui.webcamStart")}
            </button>
            {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            {frame?.behavior?.attackDetected ? (
                <p role="status"
                   className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                    {model.email.attackDetected}
                </p>
            ) : null}
        </section>
    );
};
