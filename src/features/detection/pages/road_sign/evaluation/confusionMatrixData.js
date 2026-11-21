export const confusionMatrixData = {
    classes: ["Speedlimit", "Trafficlight", "Stop", "Crosswalk", "background"],
    values: [
        { predicted: "Speedlimit", true: "Speedlimit", value: 84 },
        { predicted: "Trafficlight", true: "Trafficlight", value: 7 },
        { predicted: "Trafficlight", true: "background", value: 2 },
        { predicted: "Stop", true: "Stop", value: 6 },
        { predicted: "Crosswalk", true: "Crosswalk", value: 16 },
        { predicted: "Crosswalk", true: "background", value: 2 },
        { predicted: "background", true: "Trafficlight", value: 1 },
    ],
    normalizedValues: [
        { predicted: "Speedlimit", true: "Speedlimit", value: 1.0 },
        { predicted: "Trafficlight", true: "Trafficlight", value: 0.87 },
        { predicted: "Trafficlight", true: "background", value: 0.50 },
        { predicted: "Stop", true: "Stop", value: 1.0 },
        { predicted: "Crosswalk", true: "Crosswalk", value: 1.0 },
        { predicted: "Crosswalk", true: "background", value: 0.50 },
        { predicted: "background", true: "Trafficlight", value: 0.12 },
    ],
};
