/**
 * Read final box and mask evaluation metrics from an Ultralytics results CSV.
 *
 * @param {string} csv - CSV text containing epoch and validation metric columns.
 * @returns {{epochs: number, boxPrecision: number, boxRecall: number, boxMap50: number, boxMap5095: number, maskPrecision: number, maskRecall: number, maskMap50: number, maskMap5095: number} | null} Final metrics, or null when required data is missing or invalid.
 * @example
 * const metrics = parseInstanceSegmentationEvaluationCsv(resultsCsv);
 * // metrics.maskMap50 is the final validation mask mAP at IoU 0.50.
 */
export const parseInstanceSegmentationEvaluationCsv = (csv) => {
    if (typeof csv !== "string" || !csv.trim()) return null;

    const [headerLine, ...dataLines] = csv.trim().split(/\r?\n/);
    const headers = headerLine.split(",").map((header) => header.trim());
    const columns = {
        epochs: "epoch",
        boxPrecision: "metrics/precision(B)",
        boxRecall: "metrics/recall(B)",
        boxMap50: "metrics/mAP50(B)",
        boxMap5095: "metrics/mAP50-95(B)",
        maskPrecision: "metrics/precision(M)",
        maskRecall: "metrics/recall(M)",
        maskMap50: "metrics/mAP50(M)",
        maskMap5095: "metrics/mAP50-95(M)",
    };
    const indexes = Object.fromEntries(
        Object.entries(columns).map(([key, column]) => [key, headers.indexOf(column)]),
    );
    if (Object.values(indexes).some((index) => index < 0)) return null;

    const rows = dataLines
        .filter((line) => line.trim())
        .map((line) => line.split(",").map((value) => Number(value.trim())));
    const finalRow = rows.at(-1);
    if (!finalRow || Object.values(indexes).some((index) => !Number.isFinite(finalRow[index]))) return null;

    return Object.fromEntries(Object.entries(indexes).map(([key, index]) => [key, finalRow[index]]));
};
