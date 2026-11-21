import { getAnnotationColor } from "../../utils/getAnnotationColor.js";

/**
 * Draw a solid annotation label with a separate ID badge and right-aligned confidence.
 * Coordinates and dimensions use the canvas's current transformed coordinate system.
 *
 * @param {CanvasRenderingContext2D} context - Canvas context used to paint the label.
 * @param {object} options - Label content and drawing options.
 * @param {number} options.x - Left coordinate for the label.
 * @param {number} options.y - Top coordinate for the label.
 * @param {string} [options.className=""] - Optional class name displayed on the left.
 * @param {number|null} [options.trackId=null] - Optional track ID shown in a distinct badge.
 * @param {number|null} [options.confidence=null] - Optional confidence shown at the right from 0 to 1.
 * @param {number} [options.fontSize=18] - Font size in the context's current coordinate system.
 * @param {number} [options.padding=6] - Horizontal label padding in the current coordinate system.
 * @param {number} [options.rotation=0] - Optional label rotation in radians.
 * @param {boolean} [options.centered=false] - Center the label horizontally around its x coordinate.
 * @returns {void} Draws the label directly onto the supplied canvas context.
 *
 * @example
 * drawAnnotationLabel(context, {
 *   x: 40, y: 20, className: "person", trackId: 3, confidence: 0.92,
 * });
 */
export const drawAnnotationLabel = (context, {
    x,
    y,
    className = "",
    colorClassName = className,
    trackId = null,
    sessionKey = "",
    showTrackId = true,
    confidence = null,
    fontSize = 18,
    padding = 6,
    rotation = 0,
    centered = false,
}) => {
    context.save();
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    const idText = showTrackId && trackId != null ? `ID ${trackId}` : "";
    const confidenceText = Number.isFinite(confidence) ? `${(confidence * 100).toFixed(1)}%` : "";
    const colors = getAnnotationColor(colorClassName, trackId, sessionKey);
    const gap = fontSize * 0.4;
    const idPadding = fontSize * 0.35;
    const classWidth = className ? context.measureText(className).width : 0;
    const idWidth = idText ? context.measureText(idText).width + idPadding * 2 : 0;
    const confidenceWidth = confidenceText ? context.measureText(confidenceText).width : 0;
    const contentWidth = classWidth + idWidth + confidenceWidth
        + (className && idText ? gap : 0)
        + (confidenceText && (className || idText) ? gap : 0);
    const labelWidth = contentWidth + padding * 2;
    const labelHeight = fontSize * 1.35;
    const radius = Math.min(fontSize * 0.25, labelHeight / 2);
    const transform = context.getTransform();
    const logicalWidth = context.canvas.width / (Math.abs(transform.a) || 1);
    const labelX = centered ? x - labelWidth / 2 : Math.max(0, Math.min(x, logicalWidth - labelWidth));

    if (!className && !idText && !confidenceText) {
        context.restore();
        return;
    }
    if (rotation) {
        const centerX = labelX + labelWidth / 2;
        const centerY = y + labelHeight / 2;
        context.translate(centerX, centerY);
        context.rotate(rotation);
        context.translate(-centerX, -centerY);
    }
    context.fillStyle = colors.color;
    context.beginPath();
    context.roundRect(labelX, y, labelWidth, labelHeight, radius);
    context.fill();
    context.textBaseline = "middle";
    context.fillStyle = colors.textColor;

    let cursorX = labelX + padding;
    if (className) {
        context.fillText(className, cursorX, y + labelHeight / 2);
        cursorX += classWidth + (idText ? gap : 0);
    }
    if (idText) {
        const badgeX = cursorX;
        const badgeY = y + fontSize * 0.13;
        const badgeHeight = labelHeight - fontSize * 0.26;
        context.fillStyle = colors.badgeColor;
        context.beginPath();
        context.roundRect(badgeX, badgeY, idWidth, badgeHeight, radius * 0.7);
        context.fill();
        context.fillStyle = colors.badgeTextColor;
        context.fillText(idText, badgeX + idPadding, y + labelHeight / 2);
    }
    if (confidenceText) {
        context.textAlign = "right";
        context.fillText(confidenceText, labelX + labelWidth - padding, y + labelHeight / 2);
    }
    context.restore();
};


