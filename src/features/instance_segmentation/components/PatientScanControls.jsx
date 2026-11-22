import { Pause, Play, RotateCw, SkipBack, SkipForward } from "lucide-react";

export const PatientScanControls = ({
    currentIndex,
    total,
    filename,
    isPlaying,
    labels,
    onSelect,
    onTogglePlayback,
}) => (
    <div className="box-border w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-white">
        <div className="mb-1 grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs text-gray-300">
            <span aria-hidden="true" />
            <span className="min-w-0 truncate text-center">{filename}</span>
            <span className="shrink-0 text-right font-mono tabular-nums">{currentIndex + 1} / {total}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
            <button
                type="button"
                onClick={() => onSelect(currentIndex - 1)}
                disabled={currentIndex === 0}
                aria-label={labels.previous}
                title={labels.previous}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <SkipBack className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
                type="button"
                onClick={onTogglePlayback}
                aria-label={isPlaying ? labels.pause : currentIndex >= total - 1 ? labels.restart : labels.play}
                title={isPlaying ? labels.pause : currentIndex >= total - 1 ? labels.restart : labels.play}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500"
            >
                {isPlaying
                    ? <Pause className="h-4 w-4" aria-hidden="true" />
                    : currentIndex >= total - 1
                        ? <RotateCw className="h-4 w-4" aria-hidden="true" />
                        : <Play className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button
                type="button"
                onClick={() => onSelect(currentIndex + 1)}
                disabled={currentIndex >= total - 1}
                aria-label={labels.next}
                title={labels.next}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <SkipForward className="h-4 w-4" aria-hidden="true" />
            </button>
            <input
                type="range"
                min="0"
                max={Math.max(0, total - 1)}
                value={currentIndex}
                onChange={(event) => onSelect(Number(event.target.value))}
                aria-label={labels.slicePosition}
                className="h-1.5 min-w-0 flex-1 cursor-pointer accent-blue-500"
            />
        </div>
    </div>
);
