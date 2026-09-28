export const Checkbox = ({
    checked,
    onChange,
    children,
    className = "",
    checkboxClassName = "",
}) => (
    <label className={`flex cursor-pointer items-center gap-2 ${className}`}>
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
        <span
            className={`flex h-5 w-5 items-center justify-center rounded-md border border-gray-400 bg-gray-100 text-xs text-transparent transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-300 dark:border-gray-500 dark:bg-gray-700 dark:peer-checked:border-blue-400 dark:peer-checked:bg-blue-400 ${checkboxClassName}`}
            aria-hidden="true"
        >
            ✓
        </span>
        {children}
    </label>
);
