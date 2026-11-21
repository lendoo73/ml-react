import { useEffect, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useLanguage } from "../../context/useLanguage.js";

export const FullscreenPanelToggle = ({ visible, onClick, className = "" }) => {
    const { t } = useLanguage();
    const label = visible ? t("ui.hidePredictionControls") : t("ui.showPredictionControls");
    const Icon = visible ? PanelRightClose : PanelRightOpen;
    const positionClass = visible
        ? "ml-auto rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
        : "absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-lg bg-blue-600 p-3 text-white shadow-lg hover:bg-blue-700";

    return (
        <button
            type="button"
            onClick={onClick}
            className={`cursor-pointer ${positionClass} ${className}`}
            aria-label={label}
            title={label}
        >
            <Icon className={visible ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
        </button>
    );
};

export const FullscreenController = ({ isFullscreen, children, className = "", onHide }) => {
    return (
        <aside className={`min-w-0 ${isFullscreen
            ? "absolute right-4 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-64 -translate-y-1/2 overflow-y-auto rounded-xl border border-white/30 bg-black/60 p-4 text-white shadow-lg backdrop-blur-sm"
            : ""} ${className}`}>
            {isFullscreen && onHide ? (
                <div className="mb-3 flex">
                    <FullscreenPanelToggle visible onClick={onHide} />
                </div>
            ) : null}
            {children}
        </aside>
    );
};

export const FullscreenMediaLayout = ({
    containerRef,
    isFullscreen,
    media,
    controls,
    children,
    className = "",
}) => {
    const [showFullscreenControls, setShowFullscreenControls] = useState(true);

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (document.fullscreenElement === containerRef?.current) {
                setShowFullscreenControls(true);
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, [containerRef]);

    return (
        <div
            ref={containerRef}
            className={isFullscreen
                ? "fixed inset-0 z-50 grid h-dvh w-dvw grid-cols-1 grid-rows-1 overflow-hidden bg-black"
                : `relative grid w-full items-center gap-4 ${className}`}
        >
            <div className={`relative min-w-0 ${isFullscreen
                ? "absolute inset-0 flex h-full min-h-0 w-full items-center justify-center"
                : ""}`}>
                {media}
            </div>
            {controls && (!isFullscreen || showFullscreenControls) ? (
                <FullscreenController
                    isFullscreen={isFullscreen}
                    onHide={() => setShowFullscreenControls(false)}
                >
                    {controls}
                </FullscreenController>
            ) : null}
            {isFullscreen && controls && !showFullscreenControls ? (
                <FullscreenPanelToggle visible={false} onClick={() => setShowFullscreenControls(true)} />
            ) : null}
            {children}
        </div>
    );
};
