export const ClassSelector = ({
    classes,
    selectedClasses,
    counts = {},
    onSelectAll,
    onClearAll,
    onToggle,
    className = "",
}) => (
    <details className={`absolute bottom-3 left-3 z-10 rounded-lg bg-blue-600 px-3 py-1 text-sm text-white ${className}`}>
        <summary className="cursor-pointer">{classes.length > 0 ? "Classes" : ""}</summary>
        <div className="absolute bottom-full left-0 mb-2 min-w-44 rounded-lg bg-gray-800 p-3 text-gray-100 shadow-xl">
            <div className="mb-2 flex gap-2 border-b border-gray-700 pb-2">
                <button type="button" onClick={onSelectAll} className="text-blue-300 hover:underline">Select all</button>
                <button type="button" onClick={onClearAll} className="text-blue-300 hover:underline">Clear all</button>
            </div>
            <div className="space-y-2">
                {classes.map((className) => (
                    <label key={className} className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={selectedClasses.includes(className)}
                            onChange={() => onToggle(className)}
                        />
                        <span className="flex-1">{className}</span>
                        <span className="ml-4 tabular-nums text-gray-400">{counts[className] ?? 0}</span>
                    </label>
                ))}
            </div>
        </div>
    </details>
);
