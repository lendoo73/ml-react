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
                            name: "Classification",
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
                        {
                            id: "classification-chest-xray-custom",
                            name: "Chest X-ray classifier",
                            iconKey: "chestXray",
                            iconSrc: "/logos/covid-19.svg",
                        },
                    ],
                },
                {
                    id: "detection",
                    name: "Detection",
                    items: [
                        {
                            id: "yolo26-detect-official",
                            name: "Detection",
                            iconKey: "yolo26",
                            iconSrc: "/logos/yolo26-logo.svg",
                            activeIconSrc: "/logos/yolo26-logo-active.svg",
                        },
                        {
                            id: "person-counter-custom",
                            name: "Object counter",
                            iconKey: "pose",
                            iconSrc: "/logos/counter.png",
                        },
                        {
                            id: "detection-road-sign",
                            name: "Road sign detection",
                            iconKey: "detection",
                            iconSrc: "/logos/road-sign-logo.svg",
                        },
                        {
                            id: "detection-face-mask",
                            name: "Face mask detection",
                            iconKey: "faceMask",
                            iconSrc: "/logos/face-mask.png",
                        },
                    ],
                },
                {
                    id: "instance_segmentation",
                    name: "Instance Segmentation",
                    items: [
                        {
                            id: "instance-segmentation-yolo26",
                            name: "YOLO26 Instance Segmentation",
                            iconKey: "yolo26",
                            iconSrc: "/logos/yolo26-logo.svg",
                            activeIconSrc: "/logos/yolo26-logo-active.svg",
                        },
                        {
                            id: "instance-segmentation-brain-tumor",
                            name: "Brain tumor instance segmentation",
                            iconKey: "instanceSegmentation",
                        },
                        {
                            id: "instance-segmentation-pothole",
                            name: "Pothole instance segmentation",
                            iconKey: "pothole",
                        },
                    ],
                },
                {
                    id: "pose",
                    name: "Pose Estimation",
                    items: [
                        {
                            id: "yolo26-pose-official",
                            name: "Pose",
                            iconKey: "yolo26",
                            iconSrc: "/logos/yolo26-logo.svg",
                            activeIconSrc: "/logos/yolo26-logo-active.svg",
                        },
                        {
                            id: "bicep-curl-counter-custom",
                            name: "Bicep curl counter",
                            iconKey: "pose",
                            iconSrc: "/logos/muscles.png",
                        },
                    ],
                },
                {
                    id: "obb",
                    name: "Oriented Bounding Boxes",
                    items: [
                        {
                            id: "yolo26-obb-official",
                            name: "YOLO26 Official",
                            iconKey: "yolo26",
                            iconSrc: "/logos/yolo26-logo.svg",
                            activeIconSrc: "/logos/yolo26-logo-active.svg",
                        },
                        {
                            id: "obb-car-parking-lot-custom",
                            name: "Car parking lot counter",
                            iconKey: "car",
                        },
                    ],
                },
                {
                    id: "multi-model",
                    name: "Multi-model",
                    items: [
                        {
                            id: "knife-attack-detection",
                            name: "Knife attack detection",
                            iconKey: "detection",
                            iconSrc: "/logos/knife-attack-logo.png",
                        },
                    ],
                },
            ],
        },
];
