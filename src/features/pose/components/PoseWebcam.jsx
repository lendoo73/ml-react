import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";
import { FixedSpinner } from "../../../components/ui/FixedSpinner.jsx";
import { PredictionResultLayout } from "../../../components/ui/PredictionResultLayout.jsx";
import { PosePredictionResult } from "./PosePredictionResult.jsx";

const FRAME_INTERVAL_MS = 250;

const getWebSocketUrl = (apiPath, endpoint) => {
    const url = new URL(`${API_URL}/api/${apiPath}/${endpoint}`);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
};

export const PoseWebcam = ({ model }) => {
    const { t } = useLanguage();
    const videoRef = useRef(null);
    const captureRef = useRef(null);
    const socketRef = useRef(null);
    const timerRef = useRef(null);
    const inferencePendingRef = useRef(false);
    const streamRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [error, setError] = useState("");
    const [poses, setPoses] = useState([]);

    const stopWebcam = useCallback(() => {
        setIsTransitioning(true);
        clearInterval(timerRef.current);
        timerRef.current = null;
        inferencePendingRef.current = false;
        socketRef.current?.close();
        socketRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStream(null);
        setPoses([]);
        setIsRunning(false);
        window.setTimeout(() => setIsTransitioning(false), 300);
    }, []);

    const startWebcam = useCallback(async () => {
        setIsTransitioning(true);
        setError("");
        inferencePendingRef.current = false;
        let nextStream;

        try {
            nextStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const socket = new WebSocket(getWebSocketUrl(model.apiPath, model.endpoints.webcam));
            socket.binaryType = "arraybuffer";
            socket.onmessage = (event) => {
                inferencePendingRef.current = false;
                const nextPoses = JSON.parse(event.data ?? "[]");
                setPoses(Array.isArray(nextPoses) ? nextPoses : []);
            };
            socket.onerror = () => setError(t("ui.webcamConnectionError"));
            socket.onclose = () => {
                inferencePendingRef.current = false;
                if (socketRef.current === socket) stopWebcam();
            };

            await new Promise((resolve, reject) => {
                socket.onopen = resolve;
                socket.onerror = () => reject(new Error(t("ui.webcamConnectionError")));
            });

            socketRef.current = socket;
            streamRef.current = nextStream;
            setStream(nextStream);
            setIsRunning(true);

            const capture = captureRef.current;
            timerRef.current = window.setInterval(() => {
                const video = videoRef.current;
                if (
                    inferencePendingRef.current
                    || !video
                    || video.readyState < 2
                    || socket.readyState !== WebSocket.OPEN
                ) return;

                inferencePendingRef.current = true;
                capture.width = video.videoWidth;
                capture.height = video.videoHeight;
                capture.getContext("2d").drawImage(video, 0, 0);
                capture.toBlob((blob) => {
                    if (!blob || socket.readyState !== WebSocket.OPEN) {
                        inferencePendingRef.current = false;
                        return;
                    }
                    socket.send(blob);
                }, "image/jpeg", 0.75);
            }, FRAME_INTERVAL_MS);
        } catch (startError) {
            nextStream?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setError(startError.message || t("ui.webcamAccessError"));
            stopWebcam();
        } finally {
            setIsTransitioning(false);
        }
    }, [model, stopWebcam, t]);

    useEffect(() => () => {
        clearInterval(timerRef.current);
        socketRef.current?.close();
        streamRef.current?.getTracks().forEach((track) => track.stop());
    }, []);

    return (
        <PredictionResultLayout
            overlay={<FixedSpinner loading={isTransitioning} message={isRunning ? "Stopping webcam..." : "Starting webcam..."} />}
        >
            <PosePredictionResult
                video
                onVideoElement={(element) => {
                    videoRef.current = element;
                }}
                videoStream={stream}
                result={poses}
                countLabel={model.predictionLabel}
                showResponse={false}
                showToggle
                keypointLabels={model.keypoints}
                bottomControls={(
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={isRunning ? stopWebcam : startWebcam}
                            disabled={isTransitioning}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                        >
                            {isRunning ? t("ui.webcamStop") : t("ui.webcamStart")}
                        </button>
                        {error ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
                    </div>
                )}
            />
            <canvas ref={captureRef} className="hidden" />
        </PredictionResultLayout>
    );
};
