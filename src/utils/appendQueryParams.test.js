import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appendQueryParams } from "./appendQueryParams.js";

describe("appendQueryParams", () => {
    it("serializes arrays as repeated query parameters and keeps scalar values", () => {
        const params = appendQueryParams(new URLSearchParams("source=video"), {
            classes: ["car", "person"],
            tracking: true,
        });

        assert.deepEqual(params.getAll("classes"), ["car", "person"]);
        assert.equal(params.get("tracking"), "true");
        assert.equal(params.get("source"), "video");
        assert.equal(params.toString(), "source=video&classes=car&classes=person&tracking=true");
    });

    it("replaces existing parameters when adding an array", () => {
        const params = appendQueryParams(new URLSearchParams("classes=bike"), {
            classes: ["car", "person"],
        });

        assert.deepEqual(params.getAll("classes"), ["car", "person"]);
    });
});
