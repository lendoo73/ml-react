import { useEffect, useRef, useState } from "react";
import { ApiResponseCard } from "../../../components/ui/ApiResponseCard.jsx";
import { Checkbox } from "../../../components/ui/Checkbox.jsx";

export const PatientScanApiResponseCard = ({
    responses,
    slices,
    currentIndex,
    onSelectSlice,
    label,
    emptyLabel,
    syncLabel,
}) => {
    const sliceIndexes = new Map(slices.map(({ filename }, index) => [filename, index]));
    const responseRefs = useRef(new Map());
    const [syncEnabled, setSyncEnabled] = useState(false);
    const responseContainerRef = useRef(null);

    useEffect(() => {
        if (!syncEnabled) return;
        const filename = slices[currentIndex]?.filename;
        const responseElement = responseRefs.current.get(filename);
        const container = responseContainerRef.current;
        if (!responseElement || !container) return;

        const offset = responseElement.getBoundingClientRect().top
            - container.getBoundingClientRect().top
            - (container.clientHeight - responseElement.offsetHeight) / 2;
        container.scrollTo({ top: container.scrollTop + offset, behavior: "smooth" });
    }, [currentIndex, slices, syncEnabled]);

    return (
        <ApiResponseCard
            contentRef={responseContainerRef}
            headerContent={(
                <div className="flex items-center justify-between">
                    <span>{label}</span>
                    <Checkbox
                        checked={syncEnabled}
                        onChange={(event) => setSyncEnabled(event.target.checked)}
                        className="text-sm font-normal"
                        checkboxClassName="h-5 w-5"
                    >
                        <span>{syncLabel}</span>
                    </Checkbox>
                </div>
            )}
        >
            <div className="space-y-2">
                {responses.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>
                ) : responses.map((response) => {
                    const sliceIndex = sliceIndexes.get(response.filename);
                    const isSelected = sliceIndex === currentIndex;

                    return (
                        <button
                            key={response.filename}
                            ref={(element) => {
                                if (element) responseRefs.current.set(response.filename, element);
                                else responseRefs.current.delete(response.filename);
                            }}
                            type="button"
                            onClick={() => onSelectSlice(sliceIndex)}
                            disabled={sliceIndex === undefined}
                            aria-current={isSelected ? "true" : undefined}
                            className={`block w-full cursor-pointer rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${isSelected
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                                : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:hover:bg-gray-700"
                            }`}
                        >
                            <pre className="whitespace-pre-wrap wrap-break-word">
                                {JSON.stringify(response, null, 4)}
                            </pre>
                        </button>
                    );
                })}
            </div>
        </ApiResponseCard>
    );
};
