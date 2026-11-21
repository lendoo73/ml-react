import { useCallback, useEffect, useRef, useState } from "react";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { PredictVideo } from "../../components/PredictVideo.jsx";
import { WebcamPredictor } from "../../components/WebcamPredictor.jsx";
import { SplitterOverlay } from "./components/SplitterOverlay.jsx";
import { addObjectCountsToFrames } from "./utils/addObjectCountsToFrames.js";
import { countTrackedObjectsBySplitter } from "./utils/countTrackedObjectsBySplitter.js";
import { countObjectsBySplitter } from "./utils/countObjectsBySplitter.js";
import { updateTrackedObjectCounts } from "./utils/updateTrackedObjectCounts.js";
import { COCO_CLASSES } from "../../../../content/cocoClasses.js";

const IRREGULAR_CLASS_PLURALS = {
    person: "people",
    mouse: "mice",
    sheep: "sheep",
    skis: "skis",
    scissors: "scissors",
    broccoli: "broccoli",
    tv: "TVs",
};
const CLASS_VIDEO_SEARCH_QUERIES = {
    person: [
        "crowd of people",
        "busy hotel lobby with people",
        "crowded train station",
        "people at a busy train station",
        "busy street with pedestrians",
        "crowded city street",
        "people walking along a busy street",
        "crowded shopping mall",
        "crowd at a concert",
        "people in a busy airport terminal",
        "group of people walking",
    ],
    bicycle: [
        "bicycles parked in a crowded bike rack",
        "many cyclists riding together",
        "rows of bicycles at a busy bike station",
    ],
    car: [
        "cars in heavy city traffic",
        "parking lot full of cars",
        "long line of cars on a busy street",
    ],
    motorcycle: [
        "motorcycles lined up at a rally",
        "group of motorcyclists riding together",
        "motorcycles parked in a crowded lot",
    ],
    airplane: [
        "multiple airplanes at a busy airport",
        "planes lined up on an airport runway",
        "airplanes parked at an airport",
    ],
    bus: [
        "bus depot full of buses",
        "multiple buses at a busy station",
        "line of buses in city traffic",
    ],
    train: [
        "multiple trains at a busy station",
        "train yard with many trains",
        "busy railway station with trains",
    ],
    truck: [
        "trucks lined up at a logistics depot",
        "many trucks on a busy highway",
        "trucks being loaded at a warehouse",
    ],
    boat: [
        "busy marina full of boats",
        "many boats in a harbor",
        "boats lined up at a marina",
    ],
    bird: [
        "flock of birds in a park",
        "many birds gathered together",
        "birds covering a tree",
    ],
    sheep: [
        "flock of sheep in a field",
        "large herd of sheep on a farm",
        "many sheep gathered in a pen",
    ],
    cow: [
        "herd of cows in a field",
        "many cows gathered on a farm",
        "cows in a crowded cattle pen",
    ],
    broccoli: [
        "many heads of broccoli on a food packaging line",
        "workers sorting broccoli in a factory",
        "broccoli being packed on a production line",
        "crates of broccoli at a produce market",
    ],
    scissors: [
        "many pairs of scissors on display",
        "scissors being packaged in a factory",
        "rows of scissors in a stationery store",
    ],
};
const INITIAL_SPLITTER = {
    start: { x: 0.5, y: 0.05 },
    end: { x: 0.5, y: 0.95 },
};
const DEBOUNCE_MS = 2000;
const clamp = (value) => Math.min(Math.max(value, 0), 1);

const pluralizeClass = (className) => {
    if (IRREGULAR_CLASS_PLURALS[className]) return IRREGULAR_CLASS_PLURALS[className];
    const words = className.split(" ");
    const noun = words.pop();
    let pluralNoun;
    if (/[^aeiou]y$/i.test(noun)) pluralNoun = noun.replace(/y$/i, "ies");
    else if (/(s|x|z|ch|sh)$/i.test(noun)) pluralNoun = `${noun}es`;
    else if (/(fe|f)$/i.test(noun)) pluralNoun = noun.replace(/(fe|f)$/i, "ves");
    else pluralNoun = `${noun}s`;
    return [...words, pluralNoun].join(" ");
};

const getVideoSearchQueries = (className) => CLASS_VIDEO_SEARCH_QUERIES[className] ?? [
    `many ${pluralizeClass(className)}`,
    `a group of ${pluralizeClass(className)}`,
    `multiple ${pluralizeClass(className)} together`,
];

export const ObjectCounter = ({ model }) => {
    const [activeSourceId, setActiveSourceId] = useState("video");
    const [selectedClasses, setSelectedClasses] = useState(["person"]);
    const [classSearchTerm, setClassSearchTerm] = useState("");
    const [isClassListOpen, setIsClassListOpen] = useState(false);
    const [draftSplitter, setDraftSplitter] = useState(INITIAL_SPLITTER);
    const [splitter, setSplitter] = useState(INITIAL_SPLITTER);
    const [labels, setLabels] = useState(model.counter.defaultLabels);
    const [trackingEnabled, setTrackingEnabled] = useState(false);
    const [trackedWebcamObjects, setTrackedWebcamObjects] = useState(() => new Map());
    const [webcamReady, setWebcamReady] = useState(false);
    const [isRecounting, setIsRecounting] = useState(false);
    const dragRef = useRef(null);
    const filteredClasses = COCO_CLASSES.filter((className) => (
        className.toLowerCase().includes(classSearchTerm.trim().toLowerCase())
    ));
    const videoSubheader = selectedClasses.length === 1
        ? model.mode.video.subheader
            .replace("{classPlural}", pluralizeClass(selectedClasses[0]))
            .replace("{className}", selectedClasses[0])
        : model.counter.multipleClassesSubheader;
    const pageModel = {
        ...model,
        mode: {
            ...model.mode,
            video: {
                ...model.mode.video,
                subheader: videoSubheader,
            },
        },
        apiPath: "object_detection",
        apiModel: "yolo26x",
        classSearchQueries: {
            ...model.classSearchQueries,
            ...Object.fromEntries(selectedClasses.map((className) => [
                className,
                getVideoSearchQueries(className),
            ])),
        },
        queryParams: { classes: selectedClasses },
    };
    const sources = ["video", "webcam"].map((id) => ({
        id,
        name: model.mode[id].name,
        description: model.mode[id].description,
    }));

    useEffect(() => {
        if (draftSplitter === splitter) return undefined;
        const timer = window.setTimeout(() => {
            setSplitter(draftSplitter);
            setIsRecounting(false);
        }, DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [draftSplitter, splitter]);

    const transformResult = useCallback((frames, sourceSize, tracking) => (
        addObjectCountsToFrames(frames, splitter, sourceSize, selectedClasses, tracking)
    ), [selectedClasses, splitter]);

    const getAreaTotals = (countsByClass) => {
        if (!countsByClass) return null;
        return selectedClasses.reduce((totals, className) => ({
            first: totals.first + (countsByClass[className]?.first ?? 0),
            second: totals.second + (countsByClass[className]?.second ?? 0),
        }), { first: 0, second: 0 });
    };

    const handleDragStart = (event, pointIndex) => {
        event.preventDefault();
        const svg = event.currentTarget.ownerSVGElement;
        if (!svg) return;
        svg.setPointerCapture(event.pointerId);
        dragRef.current = { svg, pointerId: event.pointerId, pointIndex };
    };

    const handlePointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const bounds = drag.svg.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const point = {
            x: clamp((event.clientX - bounds.left) / bounds.width),
            y: clamp((event.clientY - bounds.top) / bounds.height),
        };
        const otherPoint = draftSplitter[drag.pointIndex === 0 ? "end" : "start"];
        if (Math.hypot(point.x - otherPoint.x, point.y - otherPoint.y) < 0.02) return;
        setDraftSplitter((current) => ({
            ...current,
            [drag.pointIndex === 0 ? "start" : "end"]: point,
        }));
        setIsRecounting(true);
    };

    const handlePointerEnd = (event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
    };

    const handlePointKeyDown = (event, pointIndex) => {
        const steps = {
            ArrowLeft: [-0.01, 0],
            ArrowRight: [0.01, 0],
            ArrowUp: [0, -0.01],
            ArrowDown: [0, 0.01],
        };
        const [dx, dy] = steps[event.key] ?? [];
        if (dx == null) return;
        event.preventDefault();
        const pointKey = pointIndex === 0 ? "start" : "end";
        const nextPoint = {
            x: clamp(draftSplitter[pointKey].x + dx),
            y: clamp(draftSplitter[pointKey].y + dy),
        };
        const otherPoint = draftSplitter[pointIndex === 0 ? "end" : "start"];
        if (Math.hypot(nextPoint.x - otherPoint.x, nextPoint.y - otherPoint.y) < 0.02) return;
        setDraftSplitter((current) => ({
            ...current,
            [pointKey]: nextPoint,
        }));
        setIsRecounting(true);
    };

    const handleLabelChange = (side, value) => {
        setLabels((current) => ({ ...current, [side]: value }));
    };

    const resetCountsForClassChange = () => {
        setTrackingEnabled(false);
        setTrackedWebcamObjects(new Map());
        setWebcamReady(false);
    };

    const handleAddClass = (className) => {
        if (selectedClasses.includes(className)) return;
        setSelectedClasses((currentClasses) => [...currentClasses, className]);
        resetCountsForClassChange();
        setClassSearchTerm("");
        setIsClassListOpen(false);
    };

    const handleRemoveClass = (className) => {
        if (selectedClasses.length <= 1) return;
        setSelectedClasses((currentClasses) => currentClasses.filter((item) => item !== className));
        resetCountsForClassChange();
    };

    const renderSplitterOverlay = (frame, sourceSize) => (
        <SplitterOverlay
            splitter={draftSplitter}
            sourceSize={sourceSize}
            labels={labels}
            counts={getAreaTotals(frame?.objectCounts)}
            isRecounting={isRecounting}
            text={model.counter}
            onHandlePointerDown={handleDragStart}
            onHandleKeyDown={handlePointKeyDown}
            onLabelChange={handleLabelChange}
        />
    );

    const handleWebcamFrame = useCallback((detections, sourceSize, tracking) => {
        setWebcamReady(Array.isArray(detections) && Boolean(sourceSize?.width && sourceSize?.height));
        if (tracking) {
            setTrackedWebcamObjects((currentObjects) => updateTrackedObjectCounts(
                currentObjects,
                detections,
                splitter,
                sourceSize,
                selectedClasses,
            ).trackedObjects);
        }
    }, [selectedClasses, splitter]);

    const handleTrackingChange = (nextTracking) => {
        setTrackingEnabled(nextTracking);
        setTrackedWebcamObjects(new Map());
    };

    const handleTrackingSessionStart = () => {
        setTrackedWebcamObjects(new Map());
    };

    const handleResetWebcamCounts = () => {
        setTrackedWebcamObjects((currentObjects) => new Map(
            [...currentObjects].map(([key, trackedObject]) => [
                key,
                { ...trackedObject, countedSide: null },
            ]),
        ));
    };

    const renderWebcamSplitter = (detections, sourceSize) => {
        if (!webcamReady || !sourceSize?.width || !sourceSize?.height) return null;
        return (
            <SplitterOverlay
                splitter={draftSplitter}
                sourceSize={sourceSize}
                labels={labels}
                counts={getAreaTotals(trackingEnabled
                    ? countTrackedObjectsBySplitter(trackedWebcamObjects, splitter, sourceSize, selectedClasses)
                    : countObjectsBySplitter(detections, splitter, sourceSize, selectedClasses))}
                isRecounting={isRecounting}
                text={model.counter}
                onHandlePointerDown={handleDragStart}
                onHandleKeyDown={handlePointKeyDown}
                onLabelChange={handleLabelChange}
            />
        );
    };

    const renderCounterPanel = (counts) => (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-gray-100">
            <div className="grid grid-cols-2 gap-3">
                {["first", "second"].map((side) => (
                    <div key={side} className="min-w-0 rounded-md bg-gray-900/60 p-3">
                        <p className="truncate text-sm font-medium">{labels[side]}</p>
                        <div className="mt-2 space-y-1">
                            {selectedClasses.map((className) => (
                                <div key={className} className="flex items-center justify-between gap-2 text-sm" aria-live="polite">
                                    <span className="truncate">{className}</span>
                                    <span className="text-lg font-bold">{counts?.[className]?.[side] ?? "-"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderVideoCounterPanel = (frame) => renderCounterPanel(frame?.objectCounts);
    const renderWebcamCounterPanel = (detections, sourceSize) => {
        const counts = trackingEnabled
            ? countTrackedObjectsBySplitter(trackedWebcamObjects, splitter, sourceSize, selectedClasses)
            : webcamReady
                ? countObjectsBySplitter(detections, splitter, sourceSize, selectedClasses)
                : null;
        return (
            <div className="space-y-3">
                {renderCounterPanel(counts)}
                {trackingEnabled && (
                    <button
                        type="button"
                        onClick={handleResetWebcamCounts}
                        className="w-full cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        {model.counter.resetCounts}
                    </button>
                )}
            </div>
        );
    };

    const handleSourceChange = (sourceId) => {
        setActiveSourceId(sourceId);
        if (sourceId === activeSourceId) return;
        setTrackingEnabled(false);
        setTrackedWebcamObjects(new Map());
        if (sourceId !== "webcam") setWebcamReady(false);
    };

    return (
        <ClassificationPageLayout>
            <Hero {...model.hero} image="/images/object_counter-sample.png" />
            <div
                className="relative mx-auto w-full max-w-sm"
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        setIsClassListOpen(false);
                        setClassSearchTerm("");
                    }
                }}
            >
                <label htmlFor="object-counter-class" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {model.counter.classSelectLabel}
                </label>
                <input
                    id="object-counter-class"
                    type="text"
                    role="searchbox"
                    aria-expanded={isClassListOpen}
                    aria-controls={isClassListOpen ? "object-counter-class-options" : undefined}
                    autoComplete="off"
                    value={classSearchTerm}
                    placeholder={model.counter.classSearchPlaceholder}
                    onFocus={(event) => {
                        event.currentTarget.select();
                        setIsClassListOpen(true);
                    }}
                    onChange={(event) => {
                        setClassSearchTerm(event.target.value);
                        setIsClassListOpen(true);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") setIsClassListOpen(false);
                        if (event.key === "Enter" && filteredClasses.length > 0) {
                            event.preventDefault();
                            const availableClasses = filteredClasses.filter(
                                (className) => !selectedClasses.includes(className),
                            );
                            const exactMatch = availableClasses.find(
                                (className) => className.toLowerCase() === classSearchTerm.trim().toLowerCase(),
                            );
                            if (exactMatch || availableClasses.length > 0) {
                                handleAddClass(exactMatch ?? availableClasses[0]);
                            }
                        }
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                {isClassListOpen && (
                    <div
                        id="object-counter-class-options"
                        className="mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white p-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                    >
                        {filteredClasses.length > 0 ? filteredClasses.map((className) => (
                            <div
                                key={className}
                                className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white"
                            >
                                <span>{className}</span>
                                <button
                                    type="button"
                                    disabled={selectedClasses.includes(className)}
                                    aria-label={`${selectedClasses.includes(className) ? model.counter.classAdded : model.counter.addClass} ${className}`}
                                    onClick={() => handleAddClass(className)}
                                    className="cursor-pointer rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-400 dark:text-gray-900 dark:hover:bg-blue-300"
                                >
                                    {selectedClasses.includes(className) ? model.counter.classAdded : model.counter.addClass}
                                </button>
                            </div>
                        )) : (
                            <p role="status" className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                {model.counter.noClassMatches}
                            </p>
                        )}
                    </div>
                )}
                <div className="mt-3">
                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                        {model.counter.selectedClassesLabel}
                    </p>
                    <ul className="space-y-2">
                        {selectedClasses.map((className) => (
                            <li key={className} className="flex items-center justify-between gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                                <span>{className}</span>
                                <button
                                    type="button"
                                    disabled={selectedClasses.length === 1}
                                    aria-label={`${model.counter.removeClass} ${className}`}
                                    title={selectedClasses.length === 1 ? model.counter.minimumClassRequired : undefined}
                                    onClick={() => handleRemoveClass(className)}
                                    className="cursor-pointer rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {model.counter.removeClass}
                                </button>
                            </li>
                        ))}
                    </ul>
                    {selectedClasses.length === 1 ? (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {model.counter.minimumClassRequired}
                        </p>
                    ) : null}
                </div>
            </div>
            <SourceCards
                sources={sources}
                selectedSourceId={activeSourceId}
                onSelect={handleSourceChange}
            />
            {activeSourceId === "video" ? (
                <PredictVideo
                    key={selectedClasses.join("|")}
                    model={pageModel}
                    supportsTracking
                    onTrackingChange={handleTrackingChange}
                    onTrackingSessionStart={handleTrackingSessionStart}
                    defaultShowLabels={false}
                    defaultShowConfidence={false}
                    transformResult={transformResult}
                    renderSplitterOverlay={renderSplitterOverlay}
                    renderControlsPanel={renderVideoCounterPanel}
                    onSplitterPointerMove={handlePointerMove}
                    onSplitterPointerUp={handlePointerEnd}
                    onSplitterPointerCancel={handlePointerEnd}
                    randomVideoSearchTerms={selectedClasses}
                    randomVideoLabel={selectedClasses.length > 1 ? model.counter.randomVideoForOneClass : undefined}
                    randomVideoHint={selectedClasses.length > 1 ? model.counter.randomVideoMultiClassHint : undefined}
                />
            ) : (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <WebcamPredictor
                        key={selectedClasses.join("|")}
                        model={pageModel}
                        supportsTracking
                        onTrackingChange={handleTrackingChange}
                        defaultShowLabels={false}
                        defaultShowConfidence={false}
                        onDetectionsChange={handleWebcamFrame}
                        renderSplitterOverlay={renderWebcamSplitter}
                        renderControlsPanel={renderWebcamCounterPanel}
                        onSplitterPointerMove={handlePointerMove}
                        onSplitterPointerUp={handlePointerEnd}
                        onSplitterPointerCancel={handlePointerEnd}
                    />
                </div>
            )}
        </ClassificationPageLayout>
    );
};
