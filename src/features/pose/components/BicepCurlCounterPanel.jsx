import { useMemo } from "react";
import { updateBicepCurlCounters } from "../utils/updateBicepCurlCounters.js";

const getVideoCounters = (frames, currentIndex, angleTriplets, thresholds) => {
    let counters = new Map();
    frames.slice(0, currentIndex + 1).forEach((frame) => {
        counters = updateBicepCurlCounters(counters, frame, angleTriplets, thresholds);
    });
    return [...counters.values()];
};

export const BicepCurlCounterPanel = ({
    frames,
    currentIndex,
    liveCounters = [],
    labels,
    personLabel,
    emptyLabel,
    thresholds,
    angleTriplets,
}) => {
    const videoCounters = useMemo(() => (
        Array.isArray(frames) && currentIndex >= 0
            ? getVideoCounters(frames, currentIndex, angleTriplets, thresholds)
            : null
    ), [angleTriplets, currentIndex, frames, thresholds]);
    const counters = videoCounters ?? liveCounters;

    return (
        <div className="mb-5 space-y-3" aria-live="polite">
            {counters.length === 0 ? (
                <p className="rounded-xl bg-blue-50 px-4 py-3 text-center text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {emptyLabel}
                </p>
            ) : counters.map(({ trackId, angles, counts }) => (
                <section key={trackId} className="rounded-xl bg-blue-50 p-4 dark:bg-gray-700">
                    <h3 className="mb-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {personLabel.replace("{id}", String(trackId))}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {labels.map((label, index) => (
                            <div key={label} className="rounded-lg bg-white px-3 py-2 text-center dark:bg-gray-800">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
                                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{counts[index]}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {angles[index] == null ? "--" : `${angles[index].toFixed(1)}°`}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
};
