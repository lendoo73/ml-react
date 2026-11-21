import { useState } from "react";

const VIEW_WIDTH = 1000;
const LABEL_OFFSET = 105;
const clamp = (value, maximum) => Math.min(Math.max(value, 60), maximum - 60);

const getVisibleLine = (splitter, viewHeight) => {
    const point = {
        x: splitter.start.x * VIEW_WIDTH,
        y: splitter.start.y * viewHeight,
    };
    const direction = {
        x: (splitter.end.x - splitter.start.x) * VIEW_WIDTH,
        y: (splitter.end.y - splitter.start.y) * viewHeight,
    };
    let minT = -Infinity;
    let maxT = Infinity;

    for (const [position, delta, minimum, maximum] of [
        [point.x, direction.x, 0, VIEW_WIDTH],
        [point.y, direction.y, 0, viewHeight],
    ]) {
        if (Math.abs(delta) < 1e-8) {
            if (position < minimum || position > maximum) return null;
            continue;
        }
        const firstT = (minimum - position) / delta;
        const secondT = (maximum - position) / delta;
        minT = Math.max(minT, Math.min(firstT, secondT));
        maxT = Math.min(maxT, Math.max(firstT, secondT));
    }

    if (minT > maxT) return null;
    return {
        start: {
            x: point.x + minT * direction.x,
            y: point.y + minT * direction.y,
        },
        end: {
            x: point.x + maxT * direction.x,
            y: point.y + maxT * direction.y,
        },
    };
};

const getLabelPosition = (splitter, side, viewHeight) => {
    const dx = (splitter.end.x - splitter.start.x) * VIEW_WIDTH;
    const dy = (splitter.end.y - splitter.start.y) * viewHeight;
    const length = Math.hypot(dx, dy) || 1;
    const direction = side === "first" ? 1 : -1;
    const middleX = ((splitter.start.x + splitter.end.x) / 2) * VIEW_WIDTH;
    const middleY = ((splitter.start.y + splitter.end.y) / 2) * viewHeight;
    return {
        x: clamp(middleX - (dy / length) * LABEL_OFFSET * direction, VIEW_WIDTH),
        y: clamp(middleY + (dx / length) * LABEL_OFFSET * direction, viewHeight),
    };
};

export const SplitterOverlay = ({
    splitter,
    sourceSize,
    labels,
    counts,
    isRecounting,
    text,
    onHandlePointerDown,
    onHandleKeyDown,
    onLabelChange,
}) => {
    const [editingSide, setEditingSide] = useState(null);
    const points = [splitter.start, splitter.end];
    const viewHeight = sourceSize?.width && sourceSize?.height
        ? VIEW_WIDTH * sourceSize.height / sourceSize.width
        : VIEW_WIDTH * 9 / 16;
    const visibleLine = getVisibleLine(splitter, viewHeight);

    return (
        <g>
            {visibleLine ? (
                <line
                    x1={visibleLine.start.x}
                    y1={visibleLine.start.y}
                    x2={visibleLine.end.x}
                    y2={visibleLine.end.y}
                    stroke="#facc15"
                    strokeWidth="5"
                    strokeDasharray="14 10"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                />
            ) : null}
            {points.map((point, index) => (
                <g key={index}>
                    <circle
                        cx={point.x * VIEW_WIDTH}
                        cy={point.y * viewHeight}
                        r="24"
                        fill="#111827"
                        stroke="#facc15"
                        strokeWidth="4"
                        className="cursor-grab active:cursor-grabbing"
                        style={{ pointerEvents: "all", touchAction: "none" }}
                        aria-label={`${text.movePoint} ${index + 1}`}
                        role="button"
                        tabIndex={0}
                        onPointerDown={(event) => onHandlePointerDown(event, index)}
                        onKeyDown={(event) => onHandleKeyDown(event, index)}
                    />
                    <circle
                        cx={point.x * VIEW_WIDTH}
                        cy={point.y * viewHeight}
                        r="5"
                        fill="#facc15"
                        pointerEvents="none"
                    />
                </g>
            ))}
            {["first", "second"].map((side) => {
                const position = getLabelPosition(splitter, side, viewHeight);
                const labelText = counts ? `${labels[side]}: ${counts[side]}` : labels[side];
                return editingSide === side ? (
                    <foreignObject
                        key={side}
                        x={position.x - 160}
                        y={position.y - 35}
                        width="320"
                        height="70"
                        style={{ pointerEvents: "all" }}
                    >
                        <input
                            xmlns="http://www.w3.org/1999/xhtml"
                            aria-label={`${text.renameArea} ${labels[side]}`}
                            autoFocus
                            maxLength={40}
                            value={labels[side]}
                            onChange={(event) => onLabelChange(side, event.target.value)}
                            onFocus={(event) => event.currentTarget.select()}
                            onBlur={() => setEditingSide(null)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === "Escape") setEditingSide(null);
                            }}
                            className="h-full w-full rounded-md border border-yellow-300 bg-gray-950/90 px-2 text-center text-xl font-semibold text-white outline-none focus:ring-2 focus:ring-yellow-300"
                        />
                    </foreignObject>
                ) : (
                    <text
                        key={side}
                        x={position.x}
                        y={position.y}
                        fill="white"
                        stroke="#111827"
                        strokeWidth="6"
                        paintOrder="stroke"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="cursor-pointer select-none text-2xl font-bold"
                        style={{ pointerEvents: "all" }}
                        onClick={() => setEditingSide(side)}
                    >
                        <title>{text.clickToRename}</title>
                        {labelText}
                    </text>
                );
            })}
            {isRecounting ? (
                <text
                    x={VIEW_WIDTH / 2}
                    y="40"
                    fill="white"
                    stroke="#111827"
                    strokeWidth="6"
                    paintOrder="stroke"
                    textAnchor="middle"
                    className="text-sm font-semibold"
                >
                    {text.recounting}
                </text>
            ) : null}
        </g>
    );
};
