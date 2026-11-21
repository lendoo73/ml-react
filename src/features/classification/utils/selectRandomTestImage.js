/**
 * Select a random image from a class-indexed test image manifest.
 * When no class is specified, first selects a random class with available images.
 *
 * @param {Record<string, string[]>} imagesByClass - Image filenames grouped by class.
 * @param {string} [className] - Optional class key to sample.
 * @param {string} directory - Public URL directory containing the class folders.
 * @returns {{className: string, url: string}|null} The selected class and image URL, or null when none exist.
 *
 * @example
 * selectRandomTestImage({ normal: ["xray.png"] }, "normal", "/images/test");
 * // { className: "normal", url: "/images/test/normal/xray.png" }
 */
export const selectRandomTestImage = (imagesByClass, className, directory) => {
    const availableClasses = Object.keys(imagesByClass).filter((name) => imagesByClass[name]?.length);
    const selectedClass = className ?? availableClasses[Math.floor(Math.random() * availableClasses.length)];
    const filenames = imagesByClass[selectedClass] ?? [];
    if (filenames.length === 0) return null;

    const filename = filenames[Math.floor(Math.random() * filenames.length)];
    return {
        className: selectedClass,
        url: `${directory}/${selectedClass}/${encodeURIComponent(filename)}`,
    };
};

