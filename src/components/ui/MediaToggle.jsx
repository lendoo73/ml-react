
// ./ui/MediaToggle.jsx
import { Image as ImageIcon, Video as VideoIcon } from "lucide-react";

const baseClass =
    "px-4 py-2 text-sm font-medium transition-all focus:outline-none";
const activeClass =
    "bg-blue-500 text-white shadow-md dark:text-gray-200";
const inactiveClass =
    "text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-600";

export const MediaToggle = ({
    mode,              // "image" | "video"
    onChange,          // (nextMode) => void
    imageLabel = "Image",
    videoLabel = "Video",
    ariaLabel = "Select input type"
}) => {
    return (
        <div className="flex items-center space-x-2">
            <div
                className="
                    flex rounded-full shadow-md border border-gray-200 overflow-hidden
                    bg-white dark:bg-gray-700 dark:border-gray-600
                "
                role="group"
                aria-label={ariaLabel}
            >
                <button
                    type="button"
                    onClick={() => onChange("image")}
                    aria-pressed={mode === "image"}
                    className={`${baseClass} ${mode === "image" ? activeClass : inactiveClass}`}
                >
                    <span className="inline-flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />{imageLabel}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => onChange("video")}
                    aria-pressed={mode === "video"}
                    className={`${baseClass} ${mode === "video" ? activeClass : inactiveClass}`}
                >
                    <span className="inline-flex items-center gap-2">
                        <VideoIcon className="w-4 h-4" />{videoLabel}
                    </span>
                </button>
            </div>
        </div>
    );
};
