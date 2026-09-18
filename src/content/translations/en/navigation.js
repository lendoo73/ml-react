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
                            iconKey: "classification",
                        },
                        {
                            id: "classification-custom-placeholder",
                            name: "Custom model slot",
                            iconKey: "customModel",
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
                            id: "pose-placeholder",
                            name: "Coming soon",
                            iconKey: "pose",
                        },
                    ],
                },
            ],
        },
];
