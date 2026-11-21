export const confusionMatrixData = {
    classes: ["cloudy", "foggy", "rainy", "shine", "sunrise"],
    values: [
        { predicted: "cloudy", true: "cloudy", value: 30 },
        { predicted: "foggy", true: "foggy", value: 28 },
        { predicted: "foggy", true: "rainy", value: 2 },
        { predicted: "rainy", true: "rainy", value: 26 },
        { predicted: "shine", true: "shine", value: 25 },
        { predicted: "sunrise", true: "sunrise", value: 34 },
    ],
    normalizedValues: [
        { predicted: "cloudy", true: "cloudy", value: 1.0 },
        { predicted: "foggy", true: "foggy", value: 1.0 },
        { predicted: "foggy", true: "rainy", value: 0.07 },
        { predicted: "rainy", true: "rainy", value: 0.93 },
        { predicted: "shine", true: "shine", value: 1.0 },
        { predicted: "sunrise", true: "sunrise", value: 1.0 },
    ],
};
