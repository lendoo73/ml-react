import { useEffect, useMemo, useState } from "react";
import { FixedSpinner } from "../../../components/ui/FixedSpinner.jsx";
import { ImagePredictionResult } from "../../../components/ui/ImagePredictionResult.jsx";
import { PatientScanApiResponseCard } from "./PatientScanApiResponseCard.jsx";
import { PatientScanControls } from "./PatientScanControls.jsx";
import { usePatientScanPrediction } from "../hooks/usePatientScanPrediction.js";

const isBusy = (status) => ["loading", "downloading", "predicting"].includes(status);

export const PatientScanPanel = ({ model }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const { scan, slices, apiResponses, currentIndex, status, progress, error, predict, selectSlice } =
        usePatientScanPrediction(model);
    const content = model.patientScanPanel;
    const currentSlice = slices[currentIndex];
    const visiblePredictions = useMemo(() => (
        (currentSlice?.prediction?.predictions ?? []).filter((prediction) => (
            !Number.isFinite(Number(prediction?.confidence))
            || Number(prediction.confidence) >= confidenceThreshold
        ))
    ), [confidenceThreshold, currentSlice]);
    const availableClasses = useMemo(() => [...new Set(
        apiResponses
            .flatMap((response) => response?.predictions ?? [])
            .map((prediction) => prediction.class_name)
            .filter(Boolean)
    )], [apiResponses]);

    useEffect(() => {
        if (!isPlaying || status !== "completed") return undefined;
        const timer = window.setInterval(() => {
            if (currentIndex >= slices.length - 1) setIsPlaying(false);
            else selectSlice(currentIndex + 1);
        }, 350);
        return () => window.clearInterval(timer);
    }, [currentIndex, isPlaying, selectSlice, slices.length, status]);

    useEffect(() => {
        if (status !== "completed" || slices.length === 0) return undefined;

        const handleKeyDown = (event) => {
            if (event.target instanceof HTMLElement && (
                event.target.isContentEditable || event.target.matches("input, textarea, select")
            )) return;
            if (event.key === "ArrowRight") {
                event.preventDefault();
                selectSlice(Math.min(currentIndex + 1, slices.length - 1));
            } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                selectSlice(Math.max(currentIndex - 1, 0));
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentIndex, selectSlice, slices.length, status]);

    const startScan = () => {
        setIsPlaying(false);
        void predict();
    };
    const togglePlayback = () => {
        if (!isPlaying && currentIndex >= slices.length - 1) selectSlice(0);
        setIsPlaying((playing) => !playing);
    };
    const scanControls = (
        <PatientScanControls
            currentIndex={currentIndex}
            total={slices.length}
            filename={currentSlice?.filename ?? ""}
            isPlaying={isPlaying}
            labels={{
                previous: content.previousLabel,
                play: content.playLabel,
                restart: content.restartLabel,
                pause: content.pauseLabel,
                next: content.nextLabel,
                slicePosition: content.slicePositionLabel,
            }}
            onSelect={selectSlice}
            onTogglePlayback={togglePlayback}
        />
    );

    return (
        <>
        <section className="relative rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-xl font-semibold">{content.title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{content.description}</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {content.sourceAttribution}{" "}
                <a href={content.sourceUrl} target="_blank" rel="noreferrer" className="cursor-pointer font-medium text-blue-600 hover:underline dark:text-blue-300">
                    {content.sourceLinkLabel}
                </a>
            </p>
            <div className="mt-4 flex flex-wrap gap-3" inert={isBusy(status)}>
                <button
                    type="button"
                    onClick={startScan}
                    disabled={isBusy(status)}
                    className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                >
                    {content.startLabel}
                </button>
            </div>

            {error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{content.errorLabel}: {error}</p> : null}

            {scan ? (
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-300" inert={isBusy(status)}>
                    {scan.patient_id ? <span>{content.patientLabel}: {scan.patient_id}</span> : null}
                    {scan.collection ? (
                        <span>
                            {content.collectionLabel}:{" "}
                            <a
                                href={`${content.sourceUrl}?search=${encodeURIComponent(scan.collection)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="cursor-pointer font-medium text-blue-600 hover:underline dark:text-blue-300"
                            >
                                {scan.collection}
                            </a>
                        </span>
                    ) : null}
                    {scan.modality ? <span>{content.modalityLabel}: {scan.modality}</span> : null}
                    {scan.viewer_url ? (
                        <a href={scan.viewer_url} target="_blank" rel="noreferrer" className="cursor-pointer font-medium text-blue-600 hover:underline dark:text-blue-300">
                            {content.viewerLabel}
                        </a>
                    ) : null}
                </div>
            ) : null}

            <FixedSpinner
                loading={isBusy(status)}
                message={status === "loading" ? content.loadingScan : status === "downloading" ? content.downloading : content.predicting}
                progress={status === "predicting" ? progress : undefined}
            />
        </section>
            {status === "completed" && currentSlice ? (
                <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    {currentSlice.prediction ? (
                        <ImagePredictionResult
                            image={currentSlice.file}
                            result={currentSlice.prediction}
                            countLabel={model.predictionLabel}
                            count={visiblePredictions.length}
                            polygons={visiblePredictions}
                            confidenceThreshold={confidenceThreshold}
                            onConfidenceThresholdChange={setConfidenceThreshold}
                            showLabel={content.showMasks}
                            hideLabel={content.hideMasks}
                            alt={content.sliceAlt}
                            showResponse={false}
                            showBoundaryToggle
                            scrollToResultOnImageLoad={false}
                            imageFooter={scanControls}
                            availableClasses={availableClasses}
                            showClassesPanel
                        />
                    ) : (
                        <>
                            <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{content.sliceMissing}</p>
                            {scanControls}
                        </>
                    )}
                </div>
            ) : null}
            {status === "completed" ? (
                <PatientScanApiResponseCard
                    responses={apiResponses}
                    slices={slices}
                    currentIndex={currentIndex}
                    onSelectSlice={selectSlice}
                    label={content.responsesLabel}
                    emptyLabel={content.responsesEmpty}
                    syncLabel={content.syncLabel}
                />
            ) : null}
        </>
    );
};

