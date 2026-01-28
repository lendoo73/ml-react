import React from "react";

export const FixedSpinner = ({ loading, message="please wait...", className="" }) => {
    if (!loading) return null;

    return (
        <div
            className="
                absolute inset-0 z-50
                bg-slate-950/20
                flex items-center justify-center
                pointer-events-auto
                cursor-not-allowed
            "
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <div className="text-center">
                <div
                    className="
                        inline-block
                        h-12 w-12
                        rounded-full
                        border-4
                        border-gray-200
                        border-t-[color:red]
                        animate-spin
                    "
                    aria-hidden="true"
                />
                <div className={className}>
                    <h2 className="pt-4 font-bold text-xl">{message}</h2>
                </div>
            </div>
        </div>
    );
};
