/**
 * Add query parameters to an existing URLSearchParams object.
 *
 * Array values are represented as repeated parameters, as required by APIs
 * that accept a repeated query key (for example, `classes=car&classes=person`).
 *
 * @param {URLSearchParams} searchParams - Parameters to update.
 * @param {Record<string, string | number | boolean | Array<string | number | boolean>>} queryParams - Values to add.
 * @returns {URLSearchParams} The updated parameters.
 * @example
 * appendQueryParams(new URLSearchParams(), { classes: ["car", "person"], conf: 0.5 });
 */
export const appendQueryParams = (searchParams, queryParams = {}) => {
    Object.entries(queryParams).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            searchParams.delete(key);
            value.forEach((item) => searchParams.append(key, String(item)));
            return;
        }
        searchParams.set(key, String(value));
    });
    return searchParams;
};
