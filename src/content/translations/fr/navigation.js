export const navigation = [
        {
            id: "computer-vision",
            name: "Vision par ordinateur",
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
                            name: "Classificateur météo",
                            iconKey: "weather",
                            iconSrc: "/logos/weather-logo.svg",
                        },
                        {
                            id: "classification-chest-xray-custom",
                            name: "Classificateur de radiographies thoraciques",
                            iconKey: "chestXray",
                            iconSrc: "/logos/covid-19.svg",
                        },
                    ],
                },
                {
                    id: "detection",
                    name: "Détection",
                    items: [
                        {
                            id: "yolo26-detect-official",
                            name: "Détection",
                            iconKey: "yolo26",
                            iconSrc: "/logos/yolo26-logo.svg",
                            activeIconSrc: "/logos/yolo26-logo-active.svg",
                        },
                        {
                            id: "person-counter-custom",
                            name: "Compteur d’objets",
                            iconKey: "pose",
                            iconSrc: "/logos/counter.png",
                        },
                        {
                            id: "detection-road-sign",
                            name: "Détection des panneaux routiers",
                            iconKey: "detection",
                            iconSrc: "/logos/road-sign-logo.svg",
                        },
                        {
                            id: "detection-face-mask",
                            name: "Détection des masques",
                            iconKey: "faceMask",
                            iconSrc: "/logos/face-mask.png",
                        },
                    ],
                },
                {
                    id: "instance_segmentation",
                    name: "Segmentation d’instances",
                    items: [
                        {
                            id: "instance-segmentation-yolo26",
                            name: "Segmentation d’instances YOLO26",
                            iconKey: "yolo26",
                            iconSrc: "/logos/yolo26-logo.svg",
                            activeIconSrc: "/logos/yolo26-logo-active.svg",
                        },
                        {
                            id: "instance-segmentation-brain-tumor",
                            name: "Segmentation d’instances de tumeurs cérébrales",
                            iconKey: "instanceSegmentation",
                        },
                        {
                            id: "instance-segmentation-pothole",
                            name: "Segmentation d’instances des nids-de-poule",
                            iconKey: "pothole",
                        },
                    ],
                },
                {
                    id: "pose",
                    name: "Estimation de pose",
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
                            name: "Compteur de flexions des biceps",
                            iconKey: "pose",
                            iconSrc: "/logos/muscles.png",
                        },
                    ],
                },
                {
                    id: "obb",
                    name: "Boîtes orientées",
                    items: [
                        {
                            id: "yolo26-obb-official",
                            name: "YOLO26 Officiel",
                            iconKey: "yolo26",
                            iconSrc: "/logos/yolo26-logo.svg",
                            activeIconSrc: "/logos/yolo26-logo-active.svg",
                        },
                        {
                            id: "obb-car-parking-lot-custom",
                            name: "Comptage des voitures du parking",
                            iconKey: "car",
                        },
                    ],
                },
                {
                    id: "multi-model",
                    name: "Multi-modèle",
                    items: [
                        {
                            id: "knife-attack-detection",
                            name: "Détection d’attaque au couteau",
                            iconKey: "detection",
                            iconSrc: "/logos/knife-attack-logo.png",
                        },
                    ],
                },
            ],
        },
];
