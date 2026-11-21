import { Checkbox } from "./Checkbox.jsx";
import { useLanguage } from "../../context/useLanguage.js";

export const TrackingControls = ({ tracking, onTrackingChange, tracker, onTrackerChange, disabled = false }) => {
    const { t } = useLanguage();

    return (
        <div className="mx-auto mb-2 flex w-full max-w-md flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-gray-700/80 bg-gray-800/70 px-4 py-2.5 text-gray-100 shadow-sm">
            <Checkbox
                checked={tracking}
                onChange={(event) => onTrackingChange(event.target.checked)}
                disabled={disabled}
                className="shrink-0 text-xs"
            >
                <span>{t("ui.enableTracking")}</span>
            </Checkbox>
            {tracking ? (
                <label className="flex min-w-48 flex-1 items-center gap-2 text-xs">
                    <span className="shrink-0">{t("ui.tracker")}</span>
                    <select
                        value={tracker}
                        onChange={(event) => onTrackerChange(event.target.value)}
                        disabled={disabled}
                        className="min-w-0 flex-1 cursor-pointer rounded-md border border-gray-600 bg-gray-900 px-2.5 py-1.5 text-gray-100 disabled:cursor-not-allowed"
                    >
                        <option value="bytetrack">{t("ui.byteTrack")}</option>
                        <option value="botsort">{t("ui.botSort")}</option>
                    </select>
                </label>
            ) : null}
        </div>
    );
};

