import React from "react";

export const FixedSpinner = ({ loading, message = "please wait...", progress, className = "" }) => {
    if (!loading) return null;

    const hasProgress = Number.isFinite(progress);
    const normalizedProgress = hasProgress ? Math.min(100, Math.max(0, Math.round(progress))) : null;

    return (
        <div
            className="
                absolute inset-0 z-50
                bg-slate-950/45 backdrop-blur-[2px]
                flex items-center justify-center
                pointer-events-auto
                cursor-not-allowed
            "
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <div className="min-w-56 rounded-2xl border border-white/10 bg-slate-950/90 px-8 py-7 text-center text-white shadow-2xl">
                <div
                    className="
                    relative mx-auto h-24 w-24 rounded-full p-[7px]
                "
                    style={hasProgress ? {
                        background: `conic-gradient(#3b82f6 ${normalizedProgress}%, rgba(255,255,255,0.15) ${normalizedProgress}% 100%)`,
                    } : undefined}
                >
                    <div className="h-full w-full rounded-full bg-slate-800" aria-hidden="true" />
                </div>
                <div className="pointer-events-none relative z-10 -mt-24 flex h-24 items-center justify-center">
                    {hasProgress ? (
                        <span className="text-2xl font-bold tabular-nums">{normalizedProgress}%</span>
                    ) : <span className="h-8 w-8 animate-spin rounded-full border-4 border-white/25 border-t-blue-400" />}
                </div>
                <div className={className}>
                    <h2 className="mt-6 font-semibold text-lg">{message}</h2>
                </div>
            </div>
        </div>
    );
};
