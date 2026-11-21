import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "../../../../context/useLanguage.js";
import { parseClassificationEvaluationCsv } from "../../utils/parseClassificationEvaluationCsv.js";
import { ConfusionMatrixTable } from "../../../../components/ui/ConfusionMatrixTable.jsx";
import { UnderConstruction } from "../../../../components/ui/UnderConstruction.jsx";

const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;

export const ClassificationEvaluation = ({ evaluation, csvData, maxEpochs, tensorBoardUrl, confusionMatrices, confusionMatrixData, underConstruction = false }) => {
    const { t } = useLanguage();
    const [matrixType, setMatrixType] = useState("counts");
    const [isOpen, setIsOpen] = useState(false);
    const parsedEvaluation = csvData ? parseClassificationEvaluationCsv(csvData) : evaluation;

    if (!parsedEvaluation && !csvData) return null;
    const epochsValue = parsedEvaluation && maxEpochs && parsedEvaluation.epochs < maxEpochs
        ? `${parsedEvaluation.epochs} (${t("ui.evaluationEarlyStop")})`
        : parsedEvaluation?.epochs;
    const metrics = parsedEvaluation
        ? [
            { label: t("ui.evaluationFinalTop1"), value: formatPercent(parsedEvaluation.finalAccuracyTop1) },
            { label: t("ui.evaluationBestTop1"), value: formatPercent(parsedEvaluation.bestAccuracyTop1) },
            { label: t("ui.evaluationBestEpoch"), value: parsedEvaluation.bestAccuracyEpoch },
            { label: t("ui.evaluationFinalTop5"), value: formatPercent(parsedEvaluation.finalAccuracyTop5) },
            { label: t("ui.evaluationValidationLoss"), value: parsedEvaluation.finalValidationLoss.toFixed(5) },
            { label: t("ui.evaluationEpochs"), value: epochsValue },
        ]
        : [];
    const confusionMatrixUrl = confusionMatrices?.[matrixType];
    const hasCounts = confusionMatrixData ? Boolean(confusionMatrixData.values) : Boolean(confusionMatrices?.counts);
    const hasNormalized = confusionMatrixData ? Boolean(confusionMatrixData.normalizedValues) : Boolean(confusionMatrices?.normalized);
    const hasSelectedMatrix = matrixType === "counts" ? hasCounts : hasNormalized;

    return (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls="classification-evaluation-content"
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
                        <span>{t("ui.openTensorBoard")}</span>
                    </a>
                ) : null}
            </div>
            {isOpen ? (
                <div id="classification-evaluation-content">
                    {parsedEvaluation ? (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {metrics.map(({ label, value }) => (
                                <div key={label} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/60">
                                    <p className="text-sm text-gray-500 dark:text-gray-300">{label}</p>
                                    <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
                            {t("ui.evaluationCsvInvalid")}
                        </p>
                    )}
                    {underConstruction ? <UnderConstruction /> : null}
                    {!underConstruction && hasSelectedMatrix ? (
                        <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-700">
                            <div className="flex flex-wrap justify-end gap-3">
                                {hasNormalized && hasCounts ? (
                                    <div className="inline-flex rounded-lg border border-gray-300 p-1 dark:border-gray-600">
                                        {[
                                            ["counts", t("ui.evaluationCounts")],
                                            ["normalized", t("ui.evaluationNormalized")],
                                        ].map(([type, label]) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setMatrixType(type)}
                                                aria-pressed={matrixType === type}
                                                className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                                                    matrixType === type
                                                        ? "bg-blue-600 text-white dark:bg-blue-500"
                                                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            {confusionMatrixData ? (
                                <ConfusionMatrixTable data={confusionMatrixData} normalized={matrixType === "normalized"} />
                            ) : (
                                <img
                                    src={confusionMatrixUrl}
                                    alt={t("ui.evaluationConfusionMatrixAlt")}
                                    className="mx-auto mt-4 h-auto max-w-full rounded-xl border border-gray-200 bg-white dark:border-gray-700"
                                />
                            )}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
};
