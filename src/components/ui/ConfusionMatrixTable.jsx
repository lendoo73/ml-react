import { useLanguage } from "../../context/useLanguage.js";
import { Tooltip } from "./Tooltip.jsx";

const BLUE_STOPS = [
    { position: 0, color: [247, 251, 255] },
    { position: 0.5, color: [107, 174, 214] },
    { position: 1, color: [8, 48, 107] },
];

const formatValue = (value, normalized) => {
    if (!normalized) return value;
    const percent = value * 100;
    return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
};

const getClassPhrase = (className, t) => t("ui.confusionMatrixTooltipClassPhrase").replace("{className}", className);
const getDetectionPhrase = (amount, normalized, singularKey, pluralKey, t) => (
    t(!normalized && amount === 1 ? singularKey : pluralKey)
);

const getDetectionTooltip = ({ data, valueByCell, value, predictedClass, trueClass, normalized, t }) => {
    const background = "background";
    const amount = formatValue(value, normalized);

    if (predictedClass === background && trueClass === background) {
        return t("ui.confusionMatrixDetectionBackgroundIntersection");
    }
    if (trueClass === background) {
        const lead = getDetectionPhrase(
            value,
            normalized,
            "ui.confusionMatrixDetectionFalsePositiveCountSingular",
            "ui.confusionMatrixDetectionFalsePositiveCountPlural",
            t,
        );
        const percentLead = normalized ? `${t("ui.confusionMatrixTooltipPercentOf")} ` : "";
        const message = `${amount} ${percentLead}${lead} ${predictedClass}`;
        return `${message}.`;
    }

    const objectPhrase = (count) => `${trueClass} ${t(!normalized && count === 1 ? "ui.confusionMatrixDetectionObjectSingular" : "ui.confusionMatrixDetectionObjectPlural")}`;
    if (predictedClass === background) {
        const missed = getDetectionPhrase(value, normalized, "ui.confusionMatrixDetectionMissedSingular", "ui.confusionMatrixDetectionMissedPlural", t);
        return `${amount} ${normalized ? `${t("ui.confusionMatrixTooltipPercentOf")} ` : ""}${objectPhrase(value)} ${missed}.`;
    }
    if (predictedClass !== trueClass) {
        const classifiedAs = getDetectionPhrase(value, normalized, "ui.confusionMatrixDetectionClassifiedAsSingular", "ui.confusionMatrixDetectionClassifiedAsPlural", t);
        return `${amount} ${normalized ? `${t("ui.confusionMatrixTooltipPercentOf")} ` : ""}${objectPhrase(value)} ${classifiedAs} ${predictedClass}.`;
    }

    const matched = getDetectionPhrase(value, normalized, "ui.confusionMatrixDetectionMatchedSingular", "ui.confusionMatrixDetectionMatchedPlural", t);
    const summary = [`${amount} ${normalized ? `${t("ui.confusionMatrixTooltipPercentOf")} ` : ""}${objectPhrase(value)} ${matched}.`];
    data.classes.forEach((otherPrediction) => {
        const confusedCount = valueByCell.get(`${otherPrediction}:${trueClass}`) ?? 0;
        if (otherPrediction !== trueClass && otherPrediction !== background && confusedCount > 0) {
            const classifiedAs = getDetectionPhrase(confusedCount, normalized, "ui.confusionMatrixDetectionClassifiedAsSingular", "ui.confusionMatrixDetectionClassifiedAsPlural", t);
            summary.push(`${formatValue(confusedCount, normalized)} ${normalized ? `${t("ui.confusionMatrixTooltipPercentOf")} ` : ""}${objectPhrase(confusedCount)} ${classifiedAs} ${otherPrediction}.`);
        }
    });
    const missedCount = valueByCell.get(`${background}:${trueClass}`) ?? 0;
    if (missedCount > 0) {
        const missed = getDetectionPhrase(missedCount, normalized, "ui.confusionMatrixDetectionMissedSingular", "ui.confusionMatrixDetectionMissedPlural", t);
        summary.push(`${formatValue(missedCount, normalized)} ${normalized ? `${t("ui.confusionMatrixTooltipPercentOf")} ` : ""}${objectPhrase(missedCount)} ${missed}.`);
    }
    return summary.join(" ");
};

const getBlueScaleColor = (value, maxValue) => {
    const position = maxValue === 0 ? 0 : Math.min(value / maxValue, 1);
    const [start, end] = position <= 0.5 ? [BLUE_STOPS[0], BLUE_STOPS[1]] : [BLUE_STOPS[1], BLUE_STOPS[2]];
    const localPosition = (position - start.position) / (end.position - start.position);
    const channels = start.color.map((channel, index) => Math.round(channel + (end.color[index] - channel) * localPosition));
    return `rgb(${channels.join(", ")})`;
};

export const ConfusionMatrixTable = ({ data, normalized = false, detection = false }) => {
    const { t } = useLanguage();
    const values = normalized ? data.normalizedValues ?? data.values : data.values;
    const valueByCell = new Map(values.map(({ predicted, true: trueClass, value }) => [`${predicted}:${trueClass}`, value]));
    const maxValue = normalized ? 1 : Math.max(0, ...values.map(({ value }) => value));
    const axisOffset = "calc(6.5rem + 0.5rem + 9px)";
    const matrixWidth = `calc(${data.classes.length} * var(--cm-cell-size) + ${data.classes.length - 1}px)`;
    const matrixStyle = { gridTemplateColumns: `repeat(${data.classes.length}, var(--cm-cell-size))` };
    const axisStyle = {
        ...matrixStyle,
        marginLeft: axisOffset,
    };
    const rowStyle = { gridTemplateRows: `repeat(${data.classes.length}, var(--cm-cell-size))` };
    const tableHeight = `calc(${data.classes.length} * var(--cm-cell-size) + ${data.classes.length - 1}px)`;
    const cardHeight = `calc(${tableHeight} + 1rem + 2px)`;
    const ticks = Array.from({ length: 6 }, (_, index) => 1 - index / 5);

    return (
        <div className="mx-auto mt-4 max-w-full overflow-x-auto pb-2">
            <div className="mx-auto w-fit rounded-xl border border-gray-300 bg-gray-50 p-4 shadow-sm dark:border-gray-600 dark:bg-gray-900">
                <div className="mx-auto flex w-fit items-start gap-3 text-gray-900 dark:text-gray-100" style={{ "--cm-cell-size": "clamp(2.75rem, 7vw, 4rem)" }}>
                <div className="mt-7 flex items-center justify-center" style={{ minHeight: cardHeight }}>
                    <span className="-rotate-180 whitespace-nowrap text-sm font-medium [writing-mode:vertical-rl]">{t("ui.confusionMatrixPredictedAxis")}</span>
                </div>
                <div>
                    <h4 className="mb-2 text-center text-lg font-semibold" style={{ width: matrixWidth, marginLeft: axisOffset }}>{t("ui.confusionMatrixPlotTitle")}</h4>
                    <div className="flex items-start gap-2">
                        <div className="grid w-[6.5rem] gap-px pt-2 text-sm font-medium" style={rowStyle} aria-hidden="true">
                            {data.classes.map((className) => (
                                <span key={className} className="flex items-center justify-end pr-1">{className}</span>
                            ))}
                        </div>
                        <div className="rounded-lg border border-gray-300 bg-white p-2 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                            <div className="grid gap-px" style={matrixStyle} role="grid" aria-label={t("ui.confusionMatrixTableCaption")}>
                                {data.classes.map((predictedClass) => (
                                    <div key={predictedClass} className="contents" role="row" aria-label={predictedClass}>
                                        {data.classes.map((trueClass, columnIndex) => {
                                            const value = valueByCell.get(`${predictedClass}:${trueClass}`) ?? 0;
                                            const actualClassValues = values.filter(({ true: className }) => className === trueClass);
                                            const actualTotal = actualClassValues.reduce((sum, { value: count }) => sum + count, 0);
                                            const correct = valueByCell.get(`${trueClass}:${trueClass}`) ?? 0;
                                            const misclassified = Math.max(0, actualTotal - correct);
                                            const isCorrectCell = predictedClass === trueClass;
                                            const tooltipPosition = columnIndex === 0
                                                ? "left-0 translate-x-0"
                                                : columnIndex === data.classes.length - 1
                                                    ? "right-0 left-auto translate-x-0"
                                                    : "left-1/2 -translate-x-1/2";
                                            const classPhrase = getClassPhrase(trueClass, t);
                                            const normalizedClassPhrase = `${t("ui.confusionMatrixTooltipPercentOf")} ${classPhrase}`;
                                            const amountAndClass = normalized
                                                ? `${formatValue(correct, true)} ${normalizedClassPhrase}`
                                                : `${formatValue(correct, false)} ${classPhrase}`;
                                            const classificationTooltip = isCorrectCell
                                                ? actualTotal === 0
                                                    ? `${t("ui.confusionMatrixTooltipNoImages")} ${classPhrase}.`
                                                    : misclassified === 0
                                                        ? `${t("ui.confusionMatrixTooltipAll")} ${classPhrase} ${t("ui.confusionMatrixTooltipCorrectSuffix")}${normalized ? ` (${formatValue(correct, true)})` : ""}.`
                                                        : `${amountAndClass} ${t("ui.confusionMatrixTooltipCorrectThenHowever")} ${formatValue(misclassified, normalized)} ${t("ui.confusionMatrixTooltipWereMisclassified")}`
                                                : `${formatValue(value, normalized)} ${normalized ? `${t("ui.confusionMatrixTooltipPercentOf")} ` : ""}${classPhrase} ${t("ui.confusionMatrixTooltipMisclassifiedAs")} ${predictedClass}.`;
                                            const tooltipText = detection
                                                ? getDetectionTooltip({ data, valueByCell, value, predictedClass, trueClass, normalized, t })
                                                : classificationTooltip;

                                            return (
                                                <div
                                                    key={trueClass}
                                                    role="gridcell"
                                                    tabIndex={0}
                                                    aria-label={tooltipText}
                                                    className="group relative flex aspect-square items-center justify-center border border-white/70 text-sm font-medium shadow-sm shadow-gray-900/10 transition hover:z-20 hover:scale-105 hover:shadow-md hover:ring-2 hover:ring-blue-500 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-gray-800 dark:shadow-black/30"
                                                    style={{ backgroundColor: getBlueScaleColor(value, maxValue), color: maxValue > 0 && value / maxValue > 0.55 ? "white" : "#111827" }}
                                                >
                                                    {formatValue(value, normalized)}
                                                    <Tooltip className={tooltipPosition}>
                                                        <strong className="block text-sm font-semibold text-gray-950 dark:text-white">{tooltipText}</strong>
                                                    </Tooltip>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="grid items-start" style={axisStyle}>
                        {data.classes.map((className) => (
                            <span key={className} className="flex h-24 items-start justify-center overflow-visible pt-2 text-sm font-medium">
                                <span className="-rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">{className}</span>
                            </span>
                        ))}
                    </div>
                    <p className="mt-3 text-center text-sm font-medium" style={{ width: matrixWidth, marginLeft: axisOffset }}>{t("ui.confusionMatrixTrueAxis")}</p>
                </div>
                <div className="mt-7 flex items-stretch gap-2 rounded-lg border border-gray-300 bg-white p-2 shadow-sm dark:border-gray-600 dark:bg-gray-800" style={{ height: cardHeight }} aria-hidden="true">
                    <div className="w-4 self-stretch rounded-sm border border-gray-300/70 dark:border-gray-500/70" style={{ height: tableHeight, background: "linear-gradient(to top, #f7fbff 0%, #6baed6 50%, #08306b 100%)" }} />
                    <div className="flex flex-col justify-between self-stretch text-xs text-gray-600 dark:text-gray-300" style={{ height: tableHeight }}>
                        {ticks.map((tick) => (
                            <span key={tick}>{normalized ? tick.toFixed(1) : Math.round(maxValue * tick)}</span>
                        ))}
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

