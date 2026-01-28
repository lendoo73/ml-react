export const translations = {
    en: {
        english: "English",
        french: "French",
        icon: "",
        header: "Models",
        models: [
            {
                name: "Passenger Counter",
                mode: {
                    image: {
                        name: "Image",
                        subheader: "Passenger Counting from an Image",
                        uploadLabel: "Upload CCTV image for passenger detection",
                        chooseFile: "Choose file",
                        selectedFile: "Selected file"
                    },
                    video: {
                        name: "Video",
                        subheader: "Passenger Counting from a Video",
                        uploadLabel: "Upload CCTV video for passenger detection",
                        chooseVideo: "Choose video file",
                    },
                },
                passengerCount: "Detected passengers",
                trainingInfo: {
                    title: "Model Training Info",
                    body:
                        "This model was trained using CCTV footage from Kent buses. " +
                        "For best results, please upload images from a similar onboard CCTV camera " +
                        "(comparable angle and field of view).",
                    validationLink: "Browse the hold‑out validation images (GitHub)",
                    validationLinkAria:
                        "Open the hold‑out validation image set on GitHub in a new tab"
                },
                urlInput: {
                    placeholder: "Enter image URL...",
                    buttonText: "Predict",
                },
                apiResponse: "API response",

            },
            // {
            //     name: "Brain Tumor Detection"
            // }
        ],
        image: {
            uploaded: "Uploaded image",
            showBoxes: "Show boxes",
            hideBoxes: "Hide boxes"
        }
    },
    fr: {
        english: "English",
        french: "French",
        icon: "",
        header: "Modèles",
        models: [
            {
                name: "Nombre de Passagers",
                mode: {
                    image: {
                        name: "Image",
                        uploadLabel: "Téléverser une image CCTV pour la détection de passagers",
                        chooseFile: "Choisir un fichier",
                        selectedFile: "Fichier sélectionné",
                    },
                    video: {
                        name: "Vidéo",
                        subheader: "Comptage de passagers à partir d'une vidéo",
                        uploadLabel: "Télécharger une vidéo CCTV pour la détection de passagers",
                        chooseVideo: "Choisir un fichier vidéo"
                    }
                },
                subheaders: {
                    image: "Comptage de passagers à partir d'une image",
                    video: "Comptage de passagers à partir d'une vidéo"
                },
                passengerCount: "Passagers détectés",

                trainingInfo: {
                    title: "Infos sur l’entraînement du modèle",
                    body:
                        "Ce modèle a été entraîné à partir d’enregistrements CCTV de bus du Kent. " +
                        "Pour de meilleurs résultats, téléversez des images provenant d’une caméra CCTV embarquée " +
                        "similaire (angle et champ de vision comparables).",
                    validationLink: "Parcourir les images de validation (GitHub)",
                    validationLinkAria:
                        "Ouvrir l’ensemble d’images de validation sur GitHub dans un nouvel onglet"
                },
                urlInput: {
                    placeholder: "Saisir l’URL de l’image…",
                    buttonText: "Prédire",
                },
                apiResponse: "Réponse de l’API"
            },
            // {
            //     name: "Détection de tumeurs cérébrales"
            // }
        ],
        image: {
            uploaded: "Image téléchargée",
            showBoxes: "Afficher les cadres",
            hideBoxes: "Masquer les cadres"
        }
    }
};