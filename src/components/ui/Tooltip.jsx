export const Tooltip = ({ id, className = "", children }) => (
    <span
        id={id}
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full z-30 mt-2 w-max max-w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs leading-5 text-gray-800 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 ${className}`}
    >
        {children}
    </span>
);
