/**
 * Get a frame's playback time from its timestamp or proportional position.
 *
 * @param {Array<object>} frames - Ordered prediction frames.
 * @param {number} frameIndex - Index of the selected frame in the array.
 * @param {number} duration - Source video duration in seconds.
 * @returns {number} Playback time in seconds.
 */
export const getVideoFrameTime = (frames, frameIndex, duration) => {
    const frame = frames[frameIndex];
    if (frame?.timestamp_ms != null) return Number(frame.timestamp_ms) / 1000;
    if (!Number.isFinite(duration) || duration <= 0 || frames.length <= 1) return 0;
    return duration * (frameIndex / (frames.length - 1));
};
