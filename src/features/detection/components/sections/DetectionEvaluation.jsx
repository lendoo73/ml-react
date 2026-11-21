import { ChevronDown, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../../../../context/useLanguage.js";
import { ConfusionMatrixTable } from "../../../../components/ui/ConfusionMatrixTable.jsx";
import { UnderConstruction } from "../../../../components/ui/UnderConstruction.jsx";

export const DetectionEvaluation = ({
    confusionMatrices,
    confusionMatrixData,
    showBackgroundInfo = false,
    tensorBoardUrl,
    underConstruction = false,
    tensorBoardDisabled = false,
}) => {
    const { t } = useLanguage();
    const [matrixType, setMatrixType] = useState("counts");
    const [isBackgroundInfoOpen, setIsBackgroundInfoOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const image = confusionMatrices?.[matrixType];
    const hasCounts = confusionMatrixData ? Boolean(confusionMatrixData.values) : Boolean(confusionMatrices?.counts);
    const hasNormalized = confusionMatrixData ? Boolean(confusionMatrixData.normalizedValues) : Boolean(confusionMatrices?.normalized);
    const hasSelectedMatrix = matrixType === "counts" ? hasCounts : hasNormalized;

    useEffect(() => {
        if (!isBackgroundInfoOpen) return undefined;

        const closeOnEscape = (event) => {
            if (event.key === "Escape") setIsBackgroundInfoOpen(false);
        };

        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [isBackgroundInfoOpen]);

    if (!image && !confusionMatrixData && !tensorBoardUrl && !underConstruction && !tensorBoardDisabled) return null;

    return (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls="detection-evaluation-content"
                    onClick={() => setIsOpen((open) => !open)}
                    className="flex min-h-10 flex-1 cursor-pointer items-center justify-between gap-3 rounded-lg text-left text-xl font-semibold text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-white"
                >
                    <span>{t("ui.modelEvaluation")}</span>
                    <ChevronDown
                        aria-hidden="true"
                        className={`size-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                </button>
                {tensorBoardUrl ? (
                    <a
                        href={tensorBoardUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t("ui.openTensorBoard")}
                        title={t("ui.openTensorBoard")}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-800 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-100 hover:text-orange-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-200 dark:hover:border-orange-600 dark:hover:bg-orange-900/50 dark:hover:text-orange-100"
                    >
                        <TensorBoardIcon />
                        <span>{t("ui.openTensorBoard")}</span>
                    </a>
                ) : tensorBoardDisabled ? (
                    <button
                        type="button"
                        disabled
                        aria-label={t("ui.openTensorBoard")}
                        title={t("ui.openTensorBoard")}
                        className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-500 opacity-70 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    >
                        <TensorBoardIcon />
                        <span>{t("ui.openTensorBoard")}</span>
                    </button>
                ) : null}
            </div>
            {isOpen && underConstruction ? (
                <div id="detection-evaluation-content"><UnderConstruction /></div>
            ) : null}
            {isOpen && !underConstruction && hasSelectedMatrix ? (
                <div id="detection-evaluation-content">
                    <div className={`mt-5 flex flex-wrap gap-3 ${confusionMatrixData ? "justify-end" : "items-center justify-between"}`}>
                        {!confusionMatrixData ? (
                            <div>
                                <h3 className="text-lg font-semibold">{t("ui.evaluationConfusionMatrix")}</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{t("ui.evaluationConfusionMatrixDescription")}</p>
                            </div>
                        ) : null}
                        {hasNormalized && hasCounts ? (
                            <div className="inline-flex rounded-lg border border-gray-300 p-1 dark:border-gray-600">
                                {[
                                    ["counts", t("ui.evaluationCounts")],
                                    ["normalized", t("ui.evaluationNormalized")],
                                ].map(([type, label]) => (
                                    <button key={type} type="button" onClick={() => setMatrixType(type)} aria-pressed={matrixType === type} className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium ${matrixType === type ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-200"}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                    {confusionMatrixData ? (
                        <ConfusionMatrixTable data={confusionMatrixData} normalized={matrixType === "normalized"} detection />
                    ) : (
                        <div className="relative mx-auto mt-4 w-fit max-w-full">
                            <img src={image} alt={t("ui.evaluationConfusionMatrixAlt")} className="block h-auto max-w-full rounded-xl border border-gray-200 bg-white dark:border-gray-700" />
                            {showBackgroundInfo ? (
                                <button
                                    type="button"
                                    aria-label={t("ui.roadSignBackgroundInfoOpen")}
                                    onClick={() => setIsBackgroundInfoOpen(true)}
                                    className="absolute bottom-3 right-3 inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white/95 text-gray-700 shadow-md transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-gray-600 dark:bg-gray-800/95 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
                                >
                                    <Info aria-hidden="true" className="size-5" />
                                </button>
                            ) : null}
                        </div>
                    )}
                </div>
            ) : null}
            {isBackgroundInfoOpen && isOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        aria-label={t("ui.roadSignBackgroundInfoClose")}
                        onClick={() => setIsBackgroundInfoOpen(false)}
                        className="absolute inset-0 cursor-default bg-black/50"
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="road-sign-background-info-title"
                        className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 text-gray-900 shadow-xl dark:bg-gray-800 dark:text-white"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <h2 id="road-sign-background-info-title" className="text-lg font-semibold">
                                {t("ui.roadSignBackgroundInfoTitle")}
                            </h2>
                            <button
                                type="button"
                                aria-label={t("ui.roadSignBackgroundInfoClose")}
                                onClick={() => setIsBackgroundInfoOpen(false)}
                                className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                            >
                                <X aria-hidden="true" className="size-5" />
                            </button>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                            {t("ui.roadSignBackgroundInfoDescription")}
                        </p>
                        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-700 dark:text-gray-200">
                            <li>{t("ui.roadSignBackgroundFalsePositives")}</li>
                            <li>{t("ui.roadSignBackgroundMissedDetection")}</li>
                        </ul>
                    </div>
                </div>
            ) : null}
        </section>
    );
};

const TensorBoardIcon = () => (
    <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="size-6 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
    >
        <rect width="32" height="32" rx="7" fill="#FF6F00" />
        <path
            d="M7 23V17h4v6H7Zm7 0V10h4v13h-4Zm7 0V14h4v9h-4ZM7 13l6-4 6 3 6-5"
            fill="none"
            stroke="white"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
        />
    </svg>
);

