import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";
import { SubHeader } from "../../../components/SubHeader.jsx";
import { PredictionResultLayout } from "../../../components/ui/PredictionResultLayout.jsx";
import { ConfidenceThresholdControl } from "../../../components/ui/ConfidenceThresholdControl.jsx";

export const ClassificationWebcam = ({ model, onChange }) => {
    const { t } = useLanguage();
    const videoRef = useRef(null);
    const socketRef = useRef(null);
    const canvasRef = useRef(null);
    const timerRef = useRef(null);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState("");
    const [predictions, setPredictions] = useState([]);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);

    const stopWebcam = () => {
        clearInterval(timerRef.current);
        socketRef.current?.close();
        videoRef.current?.srcObject?.getTracks().forEach((track) => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsRunning(false);
    };

    const startWebcam = async () => {
        setError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const socketUrl = new URL(`${API_URL}/api/${model.apiPath}/${model.endpoints.webcam}`);
            socketUrl.protocol = socketUrl.protocol === "https:" ? "wss:" : "ws:";
            const socket = new WebSocket(socketUrl);
            const capture = canvasRef.current;

            socket.onmessage = (event) => {
                const nextPredictions = JSON.parse(event.data);
                setPredictions(nextPredictions);
                onChange(nextPredictions);
            };
            socket.onerror = () => setError(t("ui.webcamConnectionError"));
            await new Promise((resolve, reject) => {
                socket.onopen = resolve;
                socket.onerror = () => reject(new Error(t("ui.webcamConnectionError")));
            });

            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            socketRef.current = socket;
            setIsRunning(true);
            timerRef.current = setInterval(() => {
                const video = videoRef.current;
                if (!video || video.readyState < 2 || socket.readyState !== WebSocket.OPEN) return;
                capture.width = video.videoWidth;
                capture.height = video.videoHeight;
                capture.getContext("2d").drawImage(video, 0, 0);
                capture.toBlob((blob) => blob && socket.send(blob), "image/jpeg", 0.75);
            }, 250);
        } catch (startError) {
            setError(startError.message || t("ui.webcamAccessError"));
            stopWebcam();
        }
    };

    useEffect(() => () => stopWebcam(), []);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    return (
        <PredictionResultLayout
            header={<SubHeader content={model.mode.webcam.subheader} className="mb-4 text-center" />}
            media={(
                <div ref={containerRef} className={`relative overflow-hidden rounded-xl bg-black ${isFullscreen ? "fixed inset-0 z-50 flex h-screen w-screen justify-center" : ""}`}>
                    <video ref={videoRef} className={`block w-full ${isFullscreen ? "h-screen w-screen object-contain" : ""}`} autoPlay muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}
            controls={(
                <div className="space-y-4">
                    <button
                        type="button"
                        onClick={async () => {
                            if (document.fullscreenElement) await document.exitFullscreen();
                            else await containerRef.current?.requestFullscreen();
                        }}
                        className="rounded-lg bg-blue-600 p-2 text-white"
                        aria-label={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                    >
                        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </button>
                    <ConfidenceThresholdControl value={confidenceThreshold} onChange={setConfidenceThreshold} />
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("ui.topPrediction")}</div>
                        <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                            {predictions[0]?.class_name ?? t("ui.noPredictions")}
                        </div>
                        {predictions[0] ? (
                            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                {t("ui.confidence")}: {(predictions[0].confidence * 100).toFixed(1)}%
                            </div>
                        ) : null}
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("ui.rankedPredictions")}</div>
                        <div className="mt-3 space-y-3">
                            {predictions.filter((prediction) => prediction.confidence >= confidenceThreshold).slice(0, 5).map((prediction) => (
                                <div key={`${prediction.class_name}-${prediction.class_id}`}>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-gray-900 dark:text-white">{prediction.class_name}</span>
                                        <span className="text-gray-600 dark:text-gray-300">{(prediction.confidence * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${prediction.confidence * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={isRunning ? stopWebcam : startWebcam} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                            {isRunning ? t("ui.webcamStop") : t("ui.webcamStart")}
                        </button>
                        {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
                    </div>
                </div>
            )}
        />
    );
};
