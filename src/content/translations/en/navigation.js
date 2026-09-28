export const navigation = [
        {
            id: "computer-vision",
            name: "Computer Vision",
            iconKey: "computerVision",
            sections: [
                {
                    id: "classification",
                    name: "Classification",
                    items: [
                        {
                            id: "yolo26-classify-official",
                            name: "YOLO26 Classification",
                            iconKey: "yolo26",
                            iconSrc: "/logos/yolo26-logo.svg",
                            activeIconSrc: "/logos/yolo26-logo-active.svg",
                        },
                        {
                            id: "classification-weather-custom",
                            name: "Weather classifier",
                            iconKey: "weather",
                            iconSrc: "/logos/weather-logo.svg",
                        },
                    ],
                },
                {
                    id: "detection",
                    name: "Detection",
                    items: [
                        {
                            id: "yolo26-detect-official",
                            name: "YOLO26 Official",
                            iconKey: "detection",
                        },
                        {
                            id: "detection-custom-placeholder",
                            name: "Custom model slot",
                            iconKey: "customModel",
                        },
                    ],
                },
                {
                    id: "segmentation",
                    name: "Segmentation",
                    items: [
                        {
                            id: "segmentation-placeholder",
                            name: "Segmentation model",
                            iconKey: "segmentation",
                        },
                    ],
                },
                {
                    id: "pose",
                    name: "Pose Estimation",
                    items: [
                        {
                            id: "yolo26-pose-official",
                            name: "YOLO26 Pose",
                            iconKey: "pose",
                        },
                    ],
                },
            ],
        },
];
