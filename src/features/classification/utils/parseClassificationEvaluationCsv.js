/**
 * Parses Ultralytics classification training metrics from a results.csv string.
 *
 * @param {string} csv - CSV content with epoch, top-1/top-5 accuracy, and validation loss columns.
 * @returns {{epochs: number, finalAccuracyTop1: number, bestAccuracyTop1: number, bestAccuracyEpoch: number, finalAccuracyTop5: number, finalValidationLoss: number} | null}
 * @example
 * const evaluation = parseClassificationEvaluationCsv(csvText);
 */
export const parseClassificationEvaluationCsv = (csv) => {
    const [headerLine, ...dataLines] = csv.trim().split(/\r?\n/);
    if (!headerLine || dataLines.length === 0) return null;

    const headers = headerLine.split(",").map((header) => header.trim());
    const columns = ["epoch", "metrics/accuracy_top1", "metrics/accuracy_top5", "val/loss"];
    const indexes = columns.map((column) => headers.indexOf(column));
    if (indexes.some((index) => index < 0)) return null;

    const rows = dataLines
        .filter((line) => line.trim())
        .map((line) => line.split(",").map((value) => value.trim()));
    if (
        rows.length === 0 ||
        rows.some((row) =>
            indexes.some((index) => row[index] === undefined || row[index] === "" || !Number.isFinite(Number(row[index]))),
        )
    ) {
        return null;
    }
    const numericRows = rows.map((row) => row.map(Number));

    const top1Index = indexes[1];
    const bestRow = numericRows.reduce((best, row) => (row[top1Index] > best[top1Index] ? row : best));
    const finalRow = numericRows[numericRows.length - 1];

    return {
        epochs: finalRow[indexes[0]],
        finalAccuracyTop1: finalRow[top1Index],
        bestAccuracyTop1: bestRow[top1Index],
        bestAccuracyEpoch: bestRow[indexes[0]],
        finalAccuracyTop5: finalRow[indexes[2]],
        finalValidationLoss: finalRow[indexes[3]],
    };
};
