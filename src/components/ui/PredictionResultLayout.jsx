export const PredictionResultLayout = ({
    header,
    media,
    controls,
    response,
    overlay,
    children,
    className = "",
}) => (
    <section className={`relative w-full ${className}`}>
        {overlay}
        {children ?? (
            <>
                {header}
                <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="min-w-0">{media}</div>
                    <aside className="min-w-0 space-y-4">{controls}</aside>
                </div>
                {response}
            </>
        )}
    </section>
);
