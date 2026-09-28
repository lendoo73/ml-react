export const ApiResponseCard = ({ data, label, headerContent, children, className = "" }) => (
    <div className={`mt-6 w-full overflow-hidden rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 ${className}`}>
        <div className="rounded-lg bg-blue-100 px-6 py-3 text-center text-lg font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {headerContent ?? label}
        </div>
        <div className="max-h-64 overflow-y-auto bg-white p-4 text-sm dark:bg-gray-800">
            {children ?? (
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(data, null, 4)}</pre>
            )}
        </div>
    </div>
);
