import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { API_URL } from "../../../config/settings.js";
import { useLanguage } from "../../../context/useLanguage.js";
import { SubHeader } from "../../../components/SubHeader.jsx";

export const ClassificationWebcam = ({ model, onChange }) => {
    const { t } = useLanguage();
    const videoRef = useRef(null);
    const socketRef = useRef(null);
    const canvasRef = useRef(null);
    const timerRef = useRef(null);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState("");
    const [predictions, setPredictions] = useState([]);
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
        <div
            ref={containerRef}
            className={`relative flex w-full flex-col items-center ${isFullscreen ? "fixed inset-0 z-50 justify-center overflow-hidden bg-black p-4" : ""}`}
        >
            <SubHeader content={model.mode.webcam.subheader} className="text-center" />
            <div className={`relative grid w-full gap-4 ${isFullscreen ? "max-w-none" : "max-w-6xl lg:grid-cols-[minmax(0,1fr)_20rem]"}`}>
                <div className={isFullscreen ? "relative flex w-full justify-center" : "relative"}>
                    <video ref={videoRef} className={`w-full rounded-xl bg-black ${isFullscreen ? "max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] object-contain" : ""}`} autoPlay muted playsInline />
                    <button
                        type="button"
                        onClick={async () => {
                            if (document.fullscreenElement) await document.exitFullscreen();
                            else await containerRef.current?.requestFullscreen();
                        }}
                        className="absolute right-3 top-3 z-50 rounded-lg bg-black/70 p-2 text-white hover:bg-black/90"
                        aria-label={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                    >
                        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </button>
                </div>
                <div className={`rounded-xl p-4 shadow-sm ${isFullscreen
                    ? "absolute right-4 top-1/2 z-30 w-80 -translate-y-1/2 border border-white/30 bg-black/60 text-white backdrop-blur-sm"
                    : "border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"}`}>
                    <p className={`text-sm font-medium ${isFullscreen ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>{t("ui.currentPrediction")}</p>
                    <div className="mt-3 space-y-3">
                        {predictions.slice(0, 5).map((prediction) => (
                            <div key={`${prediction.class_name}-${prediction.class_id}`}>
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">{prediction.class_name}</span>
                                    <span>{(prediction.confidence * 100).toFixed(1)}%</span>
                                </div>
                                <div className="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${prediction.confidence * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <button
                type="button"
                onClick={isRunning ? stopWebcam : startWebcam}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
                {isRunning ? t("ui.webcamStop") : t("ui.webcamStart")}
            </button>
            {error ? <p className="mt-3 text-sm text-red-600" role="alert">{error}</p> : null}
        </div>
    );
};
