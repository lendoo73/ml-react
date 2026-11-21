const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

/**
 * Extract supported flat image files from a patient scan ZIP and sort by natural filename order.
 * Nested paths and non-image entries are ignored; filenames are later used to associate predictions.
 *
 * @param {Blob} archive - ZIP archive downloaded from the scan stack endpoint.
 * @returns {Promise<Array<{ filename: string, file: File }>>} Ordered slice image files.
 *
 * @example
 * const slices = await extractPatientScanSlices(zipBlob);
 * // slices[0] is { filename: "slice_0001.jpg", file: File }
 */
export const extractPatientScanSlices = async (archive) => {
    if (!(archive instanceof Blob) || archive.size === 0) {
        throw new Error("The patient scan archive is empty or invalid.");
    }

    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(archive, { checkCRC32: true });
    const entries = Object.values(zip.files).filter((entry) => {
        const name = entry.name;
        const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
        return !entry.dir && !name.includes("/") && !name.includes("\\") && IMAGE_EXTENSIONS.has(extension);
    });

    if (entries.length === 0) throw new Error("The patient scan archive contains no supported images.");

    const slices = await Promise.all(entries.map(async (entry) => {
        const blob = await entry.async("blob");
        const filename = entry.name;
        return { filename, file: new File([blob], filename, { type: blob.type || "image/jpeg" }) };
    }));

    return slices.sort((left, right) => left.filename.localeCompare(right.filename, undefined, { numeric: true }));
};

