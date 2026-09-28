import { useEffect, useRef } from "react";

const SCROLL_DURATION_MS = 120;

const scrollFrameIntoView = (element, duration = SCROLL_DURATION_MS) => {
    let container = element.parentElement;
    while (container && container.scrollHeight <= container.clientHeight) {
        container = container.parentElement;
    }
    if (!container || duration <= 0) {
        element.scrollIntoView({ behavior: "auto", block: "nearest" });
        return;
    }

    const start = container.scrollTop;
    const target = container.scrollTop
        + element.getBoundingClientRect().top
        - container.getBoundingClientRect().top
        - (container.clientHeight - element.offsetHeight) / 2;
    const startedAt = performance.now();
    const animate = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = progress * (2 - progress);
        container.scrollTop = start + (target - start) * eased;
        if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
};

export const VideoFrameResponse = ({ frames, currentFrame, onSelectFrame, syncEnabled }) => {
    const frameRefs = useRef(new Map());

    useEffect(() => {
        if (!syncEnabled || !currentFrame) return;
        const frameElement = frameRefs.current.get(currentFrame);
        if (frameElement) scrollFrameIntoView(frameElement);
    }, [currentFrame, syncEnabled]);

    return (
    <div className="space-y-2">
        {frames.map((frame, index) => (
            <button
                key={`raw-${frame.frame_index ?? index}`}
                type="button"
                onClick={() => onSelectFrame(frame, index)}
                ref={(element) => {
                    if (element) frameRefs.current.set(frame, element);
                    else frameRefs.current.delete(frame);
                }}
                className={`block w-full rounded-lg border p-3 text-left transition ${
                    frame === currentFrame
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:hover:bg-gray-700"
                }`}
            >
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(frame, null, 4)}</pre>
            </button>
        ))}
    </div>
    );
};
