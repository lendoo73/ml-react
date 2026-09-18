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
                            name: "YOLO26 Classification",
                            iconKey: "classification",
                        },
                        {
                            id: "classification-custom-placeholder",
                            name: "Emplacement modèle custom",
                            iconKey: "customModel",
                        },
                    ],
                },
                {
                    id: "detection",
                    name: "Détection",
                    items: [
                        {
                            id: "yolo26-detect-official",
                            name: "YOLO26 Officiel",
                            iconKey: "detection",
                        },
                        {
                            id: "detection-custom-placeholder",
                            name: "Emplacement modèle custom",
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
                            name: "Modèle de segmentation",
                            iconKey: "segmentation",
                        },
                    ],
                },
                {
                    id: "pose",
                    name: "Estimation de pose",
                    items: [
                        {
                            id: "pose-placeholder",
                            name: "Bientôt disponible",
                            iconKey: "pose",
                        },
                    ],
                },
            ],
        },
];
