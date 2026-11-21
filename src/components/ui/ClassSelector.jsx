import { ClassColorRow } from "./ClassColorRow.jsx";
import { getAnnotationColor } from "../../utils/getAnnotationColor.js";

export const ClassSelector = ({
    classes,
    selectedClasses,
    counts = {},
    onSelectAll,
    onClearAll,
    onToggle,
    className = "",
    inline = false,
}) => (
    <details open={inline || undefined} className={`${inline ? "static w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-gray-100" : "absolute bottom-3 left-3 z-10 rounded-lg bg-blue-600 px-3 py-1 text-sm text-white"} ${className}`}>
        <summary className={`list-none text-center font-semibold [&::-webkit-details-marker]:hidden ${inline ? "cursor-default" : "cursor-pointer"}`}>{classes.length > 0 ? "Classes" : ""}</summary>
        <div className={`${inline ? "mt-3" : "absolute bottom-full left-0 mb-2 min-w-44"} rounded-lg bg-gray-800 p-3 text-gray-100 shadow-xl`}>
            <div className="mb-2 flex justify-between gap-2 border-b border-gray-700 pb-2">
                <button type="button" onClick={onSelectAll} className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">Select all</button>
                <button type="button" onClick={onClearAll} className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">Clear all</button>
            </div>
            <div className="space-y-2">
                {classes.map((className) => (
                    <ClassColorRow
                        key={className}
                        className={className}
                        checked={selectedClasses.includes(className)}
                        count={counts[className] ?? 0}
                        colors={getAnnotationColor(className)}
                        onChange={() => onToggle(className)}
                    />
                ))}
            </div>
        </div>
    </details>
);
