export const ClassColorRow = ({ className, checked, count, onChange, colors }) => (
    <label
        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors"
        style={{ backgroundColor: colors.color, color: colors.textColor }}
    >
        <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={onChange}
            aria-label={className}
        />
        <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition peer-focus-visible:ring-2 peer-focus-visible:ring-white"
            style={{
                backgroundColor: checked ? colors.badgeColor : "transparent",
                borderColor: checked ? colors.badgeColor : colors.textColor,
                color: checked ? colors.badgeTextColor : "transparent",
            }}
            aria-hidden="true"
        >
            ✓
        </span>
        <span className="min-w-0 flex-1 truncate">{className}</span>
        <span className="tabular-nums">{count}</span>
    </label>
);

