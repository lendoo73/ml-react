const DEFAULT_COLOR = "#475569";
const MIN_CLASS_SATURATION = 78;
const CLASS_SATURATION_RANGE = 15;
const MIN_CLASS_LIGHTNESS = 40;
const CLASS_LIGHTNESS_RANGE = 10;

/**
 * Create a stable hash for class and track identifiers without depending on model ordering.
 *
 * @param {string} value - Normalized identifier to hash.
 * @returns {number} Unsigned deterministic hash.
 */
const hashIdentifier = (value) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x7feb352d);
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x846ca68b);
    hash ^= hash >>> 16;
    return hash >>> 0;
};

const hslToRgb = (hue, saturation, lightness) => {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const section = hue / 60;
    const secondary = chroma * (1 - Math.abs((section % 2) - 1));
    const offset = lightness - chroma / 2;
    const [red, green, blue] = section < 1 ? [chroma, secondary, 0]
        : section < 2 ? [secondary, chroma, 0]
            : section < 3 ? [0, chroma, secondary]
                : section < 4 ? [0, secondary, chroma]
                    : section < 5 ? [secondary, 0, chroma]
                        : [chroma, 0, secondary];

    return [red, green, blue].map((channel) => Math.round((channel + offset) * 255));
};

const getContrastColor = (color) => {
    const luminance = color.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);

    return luminance > 0.179 ? "#111827" : "#ffffff";
};

const positiveModulo = (value, divisor) => ((value % divisor) + divisor) % divisor;
const toHslColor = (hue, saturation, lightness) => `hsl(${hue} ${saturation}% ${lightness}%)`;
const getRgb = (hue, saturation, lightness) => hslToRgb(hue, saturation / 100, lightness / 100);

/**
 * Derive a deterministic annotation color from a class and optional track ID.
 * Track variants retain the class hue family while varying hue and lightness by track ID.
 *
 * @param {string|null|undefined} className - Prediction class name.
 * @param {string|number|null} [trackId=null] - Optional ID stable within its inference session.
 * @param {string} [sessionKey=""] - Optional video/job/webcam session identity for track color variants.
 * @returns {{color: string, textColor: string, badgeColor: string, badgeTextColor: string}} Annotation, label, and ID-badge colors.
 *
 * @example
 * getAnnotationColor("person");
 * // Returns the same class color each time, independent of detection order.
 * getAnnotationColor("person", 7);
 * // Returns a stable variant that retains the person class hue.
 */
export const getAnnotationColor = (className, trackId = null, sessionKey = "") => {
    const normalizedClass = typeof className === "string" ? className.trim().toLowerCase() : "";
    if (!normalizedClass) {
        return {
            color: DEFAULT_COLOR,
            textColor: "#ffffff",
            badgeColor: "#334155",
            badgeTextColor: "#ffffff",
        };
    }

    const classHash = hashIdentifier(normalizedClass);
    const classHue = [...normalizedClass].reduce(
        (hue, character) => (hue * 31 + character.charCodeAt(0)) % 360,
        0
    );
    const classSaturation = MIN_CLASS_SATURATION + ((classHash >>> 8) % CLASS_SATURATION_RANGE);
    const baseLightness = MIN_CLASS_LIGHTNESS + ((classHash >>> 16) % CLASS_LIGHTNESS_RANGE);
    const hasTrackId = trackId !== null && trackId !== undefined && String(trackId).length > 0;
    const trackHash = hasTrackId ? hashIdentifier(`${sessionKey}:${trackId}`) : 0;
    const numericTrackId = Number(trackId);
    const sessionHash = sessionKey ? hashIdentifier(String(sessionKey)) : 0;
    const trackVariant = Number.isInteger(numericTrackId)
        ? positiveModulo(numericTrackId + sessionHash, 7)
        : trackHash % 7;
    const trackHueOffset = Number.isInteger(numericTrackId)
        ? positiveModulo(numericTrackId * 19 + sessionHash, 61) - 30
        : (trackHash % 61) - 30;
    const hue = (classHue + (hasTrackId ? trackHueOffset : 0) + 360) % 360;
    const lightness = hasTrackId ? 24 + trackVariant * 7 : baseLightness;
    const badgeLightness = Math.max(18, lightness - 14);

    return {
        color: toHslColor(hue, classSaturation, lightness),
        textColor: getContrastColor(getRgb(hue, classSaturation, lightness)),
        badgeColor: toHslColor(hue, classSaturation, badgeLightness),
        badgeTextColor: getContrastColor(getRgb(hue, classSaturation, badgeLightness)),
    };
};

