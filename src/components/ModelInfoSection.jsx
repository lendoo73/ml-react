export const ModelInfoSection = ({ info, children, className = "" }) => (
    <section className={`rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
        {info?.title ? <h2 className="text-xl font-semibold">{info.title}</h2> : null}
        {info?.description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                {info.description}
            </p>
        ) : null}
        {children}
    </section>
);

