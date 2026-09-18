import { Camera, ExternalLink, Image as ImageIcon, Video, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../context/useLanguage.js";
import { ClassificationResult } from "../features/classification/components/ClassificationResult.jsx";
import { ClassificationClassSelector } from "../features/classification/components/ClassificationClassSelector.jsx";
import { ClassificationImage } from "../features/classification/components/ClassificationImage.jsx";
import { ClassificationVideo } from "../features/classification/components/ClassificationVideo.jsx";
import { ClassificationWebcam } from "../features/classification/components/ClassificationWebcam.jsx";
import { ModelPlaceholder } from "./ModelPlaceholder.jsx";
import { PredictImage } from "../features/detection/components/PredictImage.jsx";
import { PredictVideo } from "../features/detection/components/PredictVideo.jsx";
import { WebcamPredictor } from "../features/detection/components/WebcamPredictor.jsx";
import { fetchDetectionClassPreview } from "../features/detection/services/detectionService.js";
import { SegmentationImage } from "../features/segmentation/components/SegmentationImage.jsx";
import { fetchSegmentationClassPreview } from "../features/segmentation/services/segmentationService.js";

const TAB_ICONS = {
    image: ImageIcon,
    video: Video,
    webcam: Camera,
};

const getInitialTabId = (model) => model?.supportedInputs?.[0] ?? "image";

export const ModelWorkspace = ({ model }) => {
    const { t } = useLanguage();
    const [activeTabId, setActiveTabId] = useState(getInitialTabId(model));
    const [result, setResult] = useState(null);
    const [isResultPending, setIsResultPending] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [showClasses, setShowClasses] = useState(false);
    const [selectedClass, setSelectedClass] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState("");
    const [classificationPreview, setClassificationPreview] = useState(null);
    const previewRef = useRef(null);
    const resultRef = useRef(null);
    const scrollResultIntoView = () => {
        const element = resultRef.current;
        if (!element) return;
        const top = element.getBoundingClientRect().top + window.scrollY - 24;
        window.scrollTo({ top, behavior: "smooth" });
    };

    useEffect(() => {
        setActiveTabId(getInitialTabId(model));
        setResult(null);
        setPreviewImage(null);
        setShowClasses(false);
        setSelectedClass("");
        setPreviewUrl("");
        setPreviewError("");
        setClassificationPreview(null);
    }, [model]);

    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    useEffect(() => () => {
        if (previewImage?.startsWith?.("blob:")) URL.revokeObjectURL(previewImage);
    }, [previewImage]);

    const supportedTabs = useMemo(() => (
        (model?.supportedInputs ?? []).map((inputId) => ({
            id: inputId,
            icon: TAB_ICONS[inputId],
            name: model?.mode?.[inputId]?.name ?? inputId,
            description: model?.mode?.[inputId]?.description ?? "",
        }))
    ), [model]);

    const showClassBrowser = ["detection", "segmentation"].includes(model?.resultType)
        && Array.isArray(model?.classes)
        && model.classes.length > 0;
    const showClassificationSelector = model?.resultType === "classification" && model?.endpoints?.search;

    const handleClassClick = async (className) => {
        if (!model?.apiPath || (!model?.endpoints?.search && !model?.previewImageUrl)) return;

        setSelectedClass(className);
        setPreviewError("");
        setIsLoadingPreview(true);
        requestAnimationFrame(() => {
            previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });

        try {
            if (model.resultType === "segmentation") {
                const imageBlob = await fetchSegmentationClassPreview(model, className);
                const nextPreviewUrl = URL.createObjectURL(imageBlob);
                setPreviewUrl((currentPreviewUrl) => {
                    if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
                    return nextPreviewUrl;
                });
                return;
            }
            const imageBlob = await fetchDetectionClassPreview(model, className);
            const nextPreviewUrl = URL.createObjectURL(imageBlob);
            setPreviewUrl((currentPreviewUrl) => {
                if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
                return nextPreviewUrl;
            });
        } catch (error) {
            console.error("Unable to load class preview:", error);
            setPreviewUrl("");
            setPreviewError(model?.info?.previewError ?? "");
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleResultChange = (nextResult, nextPreviewImage = null) => {
        setResult(nextResult);
        setIsResultPending(false);
        setPreviewImage((currentPreviewImage) => {
            if (currentPreviewImage?.startsWith?.("blob:")) {
                URL.revokeObjectURL(currentPreviewImage);
            }

            return nextPreviewImage instanceof Blob
                ? URL.createObjectURL(nextPreviewImage)
                : nextPreviewImage;
        });
    };
    const clearResults = () => {
        setIsResultPending(true);
        setPreviewImage((currentPreviewImage) => {
            if (currentPreviewImage?.startsWith?.("blob:")) URL.revokeObjectURL(currentPreviewImage);
            return null;
        });
    };

    if (!model) return null;

    if (model.status === "placeholder") {
        return (
            <section className="min-h-screen px-6 py-8 text-gray-900 dark:text-gray-100">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
                    <HeroSection model={model} />
                    <ModelPlaceholder model={model} />
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen px-6 py-8 text-gray-900 dark:text-gray-100">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
                <HeroSection model={model} />

                {model.info ? (
                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold">{model.info.title}</h2>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    {model.info.description}
                                </p>
                            </div>
                            {showClassBrowser ? (
                                <button
                                    type="button"
                                    onClick={() => setShowClasses((visible) => !visible)}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    aria-expanded={showClasses}
                                >
                                    {showClasses ? model.info.hideClasses : model.info.showClasses}
                                </button>
                            ) : null}
                        </div>
                        {showClassificationSelector ? (
                            <ClassificationClassSelector
                                model={model}
                                onPreview={(url, className) => setClassificationPreview({ url, className })}
                            />
                        ) : null}
                        {showClasses ? (
                            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-gray-200 pt-5 text-sm text-gray-700 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 dark:border-gray-700 dark:text-gray-300">
                                {model.classes.map((className, index) => (
                                    <button
                                        key={className}
                                        type="button"
                                        onClick={() => handleClassClick(className)}
                                        disabled={isLoadingPreview}
                                        className={`cursor-pointer rounded-md bg-gray-100 px-2 py-1 text-left transition hover:bg-blue-100 hover:text-blue-800 disabled:cursor-wait disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-blue-900 dark:hover:text-blue-100 ${selectedClass === className ? "ring-2 ring-blue-500" : ""}`}
                                    >
                                        {index}. {className}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {classificationPreview ? (
                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <h2 className="text-xl font-semibold">
                                {t("ui.classificationRandomPreview")}: {classificationPreview.className}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setClassificationPreview(null)}
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                                aria-label={t("ui.closePreview")}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <img
                            src={classificationPreview.url}
                            alt={`${classificationPreview.className} ${t("ui.classificationPreviewAlt")}`}
                            className="max-h-[36rem] w-full rounded-xl bg-black object-contain"
                        />
                    </div>
                ) : null}

                {selectedClass ? (
                    <div
                        ref={previewRef}
                        className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <h2 className="text-xl font-semibold">
                                {model.info.previewTitle}: {selectedClass}
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedClass("");
                                    setPreviewUrl("");
                                    setPreviewError("");
                                }}
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                                aria-label={model.info.closePreview}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        {isLoadingPreview ? (
                            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true" />
                                <span>{model.info.loadingPreview}</span>
                            </div>
                        ) : null}
                        {previewError ? <p className="text-sm text-red-600 dark:text-red-300">{previewError}</p> : null}
                        {previewUrl ? (
                            <div className="relative">
                                <img
                                    src={previewUrl}
                                    alt={`${selectedClass} ${model.info.previewAlt}`}
                                    className={`max-h-[36rem] w-full rounded-xl bg-black object-contain transition ${isLoadingPreview ? "blur-sm opacity-60" : ""}`}
                                />
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="flex flex-wrap justify-center gap-4">
                    {supportedTabs.map(({ id, icon: Icon, name, description }) => {
                        const isActive = activeTabId === id;

                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setActiveTabId(id)}
                                className={`w-full max-w-[17rem] rounded-2xl border px-5 py-4 text-left transition ${
                                    isActive
                                        ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                                        : "border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-blue-500 dark:hover:bg-gray-700"
                                }`}
                            >
                                {Icon ? <Icon className="mb-3 h-5 w-5" aria-hidden="true" /> : null}
                                <div className="text-base font-semibold">{name}</div>
                                <p className={`mt-2 text-sm ${isActive ? "text-blue-100" : "text-gray-500 dark:text-gray-300"}`}>
                                    {description}
                                </p>
                            </button>
                        );
                    })}
                </div>

                <div className={activeTabId === "video" ? "" : "rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"}>
                    {activeTabId === "image" ? (
                        model.resultType === "classification"
                            ? <ClassificationImage model={model} onChange={handleResultChange} onPredictionStart={clearResults} />
                            : model.resultType === "segmentation"
                                ? <SegmentationImage model={model} onChange={handleResultChange} onPredictionStart={clearResults} />
                            : <PredictImage model={model} onChange={handleResultChange} onPredictionStart={clearResults} previewImage={previewImage} />
                    ) : null}
                    {activeTabId === "video" ? (
                        model.supportedInputs.includes("video")
                            ? model.resultType === "classification"
                                ? <ClassificationVideo model={model} onChange={handleResultChange} />
                                : <PredictVideo model={model} />
                            : <p className="text-sm text-gray-500 dark:text-gray-400">{t("ui.modeUnavailable")}</p>
                    ) : null}
                    {activeTabId === "webcam" ? (
                        model.supportedInputs.includes("webcam")
                            ? model.resultType === "classification"
                                ? <ClassificationWebcam model={model} onChange={handleResultChange} />
                                : <WebcamPredictor model={model} isSegmentation={model.resultType === "segmentation"} />
                            : <p className="text-sm text-gray-500 dark:text-gray-400">{t("ui.modeUnavailable")}</p>
                    ) : null}
                </div>

                {model.resultType === "classification" && activeTabId === "image" && (result || previewImage) ? (
                    <div ref={resultRef} className={`rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${isResultPending ? "pointer-events-none select-none opacity-40 blur-sm" : ""}`}>
                        <ClassificationResult image={previewImage} result={result} onImageLoad={scrollResultIntoView} />
                        <JsonPanel result={result} />
                    </div>
                ) : null}
            </div>
        </section>
    );
};

const HeroSection = ({ model }) => {
    return (
    <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 px-8 py-10 text-white shadow-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="min-w-0 flex-1">
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{model.hero.badge}</p>
                <h1 className="mt-3 text-4xl font-bold">{model.hero.title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-100">{model.hero.description}</p>
                {model.links?.length ? (
                    <div className="mt-6 flex flex-wrap gap-3">
                        {model.links.map(({ id, href, label }) => (
                            <a
                                key={id}
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"
                            >
                                {label}
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            </a>
                        ))}
                    </div>
                ) : null}
            </div>
            {model.hero.image ? (
                <a
                    href={model.hero.imageHref}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block shrink-0 self-center p-1 transition hover:scale-[1.02] focus:outline-none lg:-my-6 lg:-mr-4"
                    aria-label={model.hero.imageLinkLabel ?? model.hero.title}
                >
                    <img
                        src={model.hero.image}
                        alt={model.hero.imageAlt ?? model.hero.title}
                        className="block h-auto min-h-36 w-full rounded-2xl border border-white/40 object-contain shadow-lg lg:min-h-0 lg:w-80"
                    />
                </a>
            ) : null}
        </div>
    </div>
    );
};

const JsonPanel = ({ result }) => {
    const { t } = useLanguage();

    if (!result) return null;

    return (
        <div className="mt-6 w-full rounded-lg overflow-hidden border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <div className="rounded-lg bg-blue-100 px-6 py-3 text-center text-lg font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {t("ui.apiResponse")}
            </div>
            <div className="max-h-64 overflow-y-auto bg-white p-4 text-sm dark:bg-gray-800">
                <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(result, null, 4)}
                </pre>
            </div>
        </div>
    );
};
