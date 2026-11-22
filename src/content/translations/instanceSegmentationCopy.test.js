import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { models as englishModels } from "./en/models.js";
import { navigation as englishNavigation } from "./en/navigation.js";
import { models as frenchModels } from "./fr/models.js";
import { navigation as frenchNavigation } from "./fr/navigation.js";

const getInstanceSegmentationSection = (navigation) => (
    navigation
        .flatMap((category) => category.sections ?? [])
        .find((section) => section.id === "instance_segmentation")
);

describe("YOLO26 instance segmentation copy", () => {
    it("distinguishes English instance segmentation from semantic segmentation", () => {
        const model = englishModels["segmentation-placeholder"];
        const section = getInstanceSegmentationSection(englishNavigation);

        assert.equal(model.name, "Instance segmentation");
        assert.equal(section.name, "Instance Segmentation");
        assert.equal(section.items[0].id, "segmentation-placeholder");
        assert.match(section.items[0].name, /Instance Segmentation/);
        assert.match(model.hero.description, /pixel-level mask/i);
        assert.match(model.hero.description, /semantic segmentation/i);
        assert.match(model.info.description, /two cars.*two distinct instances/i);
        assert.match(model.info.description, /class to each pixel/i);
        assert.equal(model.mode.image.uploadLabel, "Upload an image for instance segmentation");
        assert.equal(model.predictionLabel, "Detected instances");
    });

    it("provides matching French instance and semantic segmentation terminology", () => {
        const model = frenchModels["segmentation-placeholder"];
        const section = getInstanceSegmentationSection(frenchNavigation);

        assert.equal(model.name, "Segmentation d’instances");
        assert.equal(section.name, "Segmentation d’instances");
        assert.match(section.items[0].name, /Segmentation d’instances/);
        assert.match(model.hero.description, /segmentation sémantique/i);
        assert.match(model.info.description, /instances distinctes/i);
        assert.match(model.info.description, /chaque pixel/i);
        assert.equal(model.mode.image.uploadLabel, "Importer une image pour la segmentation d’instances");
        assert.equal(model.predictionLabel, "Instances détectées");
    });
});
