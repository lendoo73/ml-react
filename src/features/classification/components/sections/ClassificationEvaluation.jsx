import { useLanguage } from "../../../../context/useLanguage.js";
import { parseClassificationEvaluationCsv } from "../../utils/parseClassificationEvaluationCsv.js";

const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;

export const ClassificationEvaluation = ({ evaluation, csvData, maxEpochs, tensorBoardUrl }) => {
    const { t } = useLanguage();
    const parsedEvaluation = csvData ? parseClassificationEvaluationCsv(csvData) : evaluation;

    if (!parsedEvaluation && !csvData) return null;
    if (!parsedEvaluation) {
        return (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("ui.modelEvaluation")}</h2>
                    {tensorBoardUrl ? (
                        <a
                            href={tensorBoardUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={t("ui.openTensorBoard")}
                            title={t("ui.openTensorBoard")}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-800 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-100 hover:text-orange-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-200 dark:hover:border-orange-600 dark:hover:bg-orange-900/50 dark:hover:text-orange-100"
                        >
                            <svg aria-hidden="true" viewBox="0 0 32 32" className="size-6 shrink-0" xmlns="http://www.w3.org/2000/svg">
                                <rect width="32" height="32" rx="7" fill="#FF6F00" />
                                <path d="M7 23V17h4v6H7Zm7 0V10h4v13h-4Zm7 0V14h4v9h-4ZM7 13l6-4 6 3 6-5" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                            <span>{t("ui.openTensorBoard")}</span>
                        </a>
                    ) : null}
                </div>
                <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
                    {t("ui.evaluationCsvInvalid")}
                </p>
            </section>
        );
    }

    const epochsValue =
        maxEpochs && parsedEvaluation.epochs < maxEpochs
            ? `${parsedEvaluation.epochs} (${t("ui.evaluationEarlyStop")})`
            : parsedEvaluation.epochs;
    const metrics = [
        { label: t("ui.evaluationFinalTop1"), value: formatPercent(parsedEvaluation.finalAccuracyTop1) },
        { label: t("ui.evaluationBestTop1"), value: formatPercent(parsedEvaluation.bestAccuracyTop1) },
        { label: t("ui.evaluationBestEpoch"), value: parsedEvaluation.bestAccuracyEpoch },
        { label: t("ui.evaluationFinalTop5"), value: formatPercent(parsedEvaluation.finalAccuracyTop5) },
        { label: t("ui.evaluationValidationLoss"), value: parsedEvaluation.finalValidationLoss.toFixed(5) },
        { label: t("ui.evaluationEpochs"), value: epochsValue },
    ];

    return (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("ui.modelEvaluation")}</h2>
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
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/60">
                        <p className="text-sm text-gray-500 dark:text-gray-300">{label}</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};
