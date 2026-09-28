import { Camera, Image as ImageIcon, Video } from "lucide-react";

const SOURCE_ICONS = {
    image: ImageIcon,
    video: Video,
    webcam: Camera,
};

export const SourceCards = ({ sources = [], selectedSourceId, onSelect }) => {
    return (
        <div className="flex flex-wrap justify-center gap-4">
            {sources.map(({ id, name, description }) => {
                const Icon = SOURCE_ICONS[id];
                const isSelected = selectedSourceId === id;

                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onSelect(id)}
                        className={`w-full max-w-[17rem] rounded-2xl border px-5 py-4 text-left transition ${
                            isSelected
                                ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                                : "border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-blue-500 dark:hover:bg-gray-700"
                        }`}
                    >
                        {Icon ? <Icon className="mb-3 h-5 w-5" aria-hidden="true" /> : null}
                        <div className="text-base font-semibold">{name}</div>
                        <p className={`mt-2 text-sm ${isSelected ? "text-blue-100" : "text-gray-500 dark:text-gray-300"}`}>
                            {description}
                        </p>
                    </button>
                );
            })}
        </div>
    );
};
