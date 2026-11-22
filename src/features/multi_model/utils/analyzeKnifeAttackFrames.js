const normalizeClassName = (value) => String(value ?? "").trim().toLowerCase();

const isValidPolygon = (polygon) => (
    Array.isArray(polygon)
    && polygon.length >= 3
    && polygon.every((point) => (
        Array.isArray(point)
        && point.length >= 2
        && Number.isFinite(Number(point[0]))
        && Number.isFinite(Number(point[1]))
    ))
);

const pointOnSegment = (point, start, end) => {
    const cross = (point[1] - start[1]) * (end[0] - start[0])
        - (point[0] - start[0]) * (end[1] - start[1]);
    if (Math.abs(cross) > 1e-7) return false;
    return point[0] >= Math.min(start[0], end[0]) - 1e-7
        && point[0] <= Math.max(start[0], end[0]) + 1e-7
        && point[1] >= Math.min(start[1], end[1]) - 1e-7
        && point[1] <= Math.max(start[1], end[1]) + 1e-7;
};

const pointInPolygon = (point, polygon) => {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
        const start = polygon[index];
        const end = polygon[previous];
        if (pointOnSegment(point, start, end)) return true;
        const crosses = (start[1] > point[1]) !== (end[1] > point[1])
            && point[0] < ((end[0] - start[0]) * (point[1] - start[1]))
                / (end[1] - start[1]) + start[0];
        if (crosses) inside = !inside;
    }
    return inside;
};

const orientation = (a, b, c) => (
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
);

const segmentsIntersect = (a, b, c, d) => {
    const abC = orientation(a, b, c);
    const abD = orientation(a, b, d);
    const cdA = orientation(c, d, a);
    const cdB = orientation(c, d, b);
    if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
        && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return true;
    return (Math.abs(abC) <= 1e-7 && pointOnSegment(c, a, b))
        || (Math.abs(abD) <= 1e-7 && pointOnSegment(d, a, b))
        || (Math.abs(cdA) <= 1e-7 && pointOnSegment(a, c, d))
        || (Math.abs(cdB) <= 1e-7 && pointOnSegment(b, c, d));
};

const polygonsOverlap = (first, second) => {
    if (!isValidPolygon(first) || !isValidPolygon(second)) return false;
    if (first.some((point) => pointInPolygon(point, second))
        || second.some((point) => pointInPolygon(point, first))) return true;
    return first.some((point, index) => {
        const next = first[(index + 1) % first.length];
        return second.some((otherPoint, otherIndex) => (
            segmentsIntersect(
                point,
                next,
                otherPoint,
                second[(otherIndex + 1) % second.length],
            )
        ));
    });
};

const squaredDistanceToSegment = (point, start, end) => {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) {
        return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2;
    }
    const projection = Math.max(0, Math.min(1, (
        (point[0] - start[0]) * dx + (point[1] - start[1]) * dy
    ) / lengthSquared));
    return (point[0] - (start[0] + projection * dx)) ** 2
        + (point[1] - (start[1] + projection * dy)) ** 2;
};

const polygonDistance = (first, second) => {
    if (polygonsOverlap(first, second)) return 0;
    let distance = Infinity;
    first.forEach((point) => {
        second.forEach((_, index) => {
            distance = Math.min(
                distance,
                squaredDistanceToSegment(point, second[index], second[(index + 1) % second.length]),
            );
        });
    });
    second.forEach((point) => {
        first.forEach((_, index) => {
            distance = Math.min(
                distance,
                squaredDistanceToSegment(point, first[index], first[(index + 1) % first.length]),
            );
        });
    });
    return distance;
};

const pointPolygonDistance = (point, polygon) => {
    if (pointInPolygon(point, polygon)) return 0;
    return polygon.reduce((distance, _, index) => Math.min(
        distance,
        squaredDistanceToSegment(point, polygon[index], polygon[(index + 1) % polygon.length]),
    ), Infinity);
};

const getWristDistances = (frame, people, knives) => {
    const poses = frame?.predictions?.["pose-estimation"];
    const distances = new Map();
    if (!Array.isArray(poses) || !knives.length) return distances;

    poses.forEach((pose) => {
        const keypoints = pose?.keypoints;
        if (!Array.isArray(keypoints)) return;
        [9, 10].forEach((wristIndex) => {
            const wrist = keypoints[wristIndex];
            if (!Array.isArray(wrist) || !Number.isFinite(Number(wrist[0]))
                || !Number.isFinite(Number(wrist[1]))) return;
            const point = [Number(wrist[0]), Number(wrist[1])];
            const person = people.find(({ item }) => pointInPolygon(point, item.polygon));
            if (!person) return;
            const distance = Math.min(...knives.map((knife) => (
                pointPolygonDistance(point, knife.polygon)
            )));
            distances.set(person.identity, Math.min(
                distances.get(person.identity) ?? Infinity,
                distance,
            ));
        });
    });

    return distances;
};

const getIdentity = (person, index) => (
    person?.track_id == null ? `frame-person-${index}` : `track-${person.track_id}`
);

const getTrackId = (identity) => (
    identity?.startsWith("track-")
        ? Number.isFinite(Number(identity.slice("track-".length)))
            ? Number(identity.slice("track-".length))
            : identity.slice("track-".length)
        : null
);

const toKnifeInstance = (detection) => {
    if (normalizeClassName(detection?.class_name) !== "knife") return null;
    const {x_min: xMin, y_min: yMin, x_max: xMax, y_max: yMax} = detection?.bbox ?? {};
    if (![xMin, yMin, xMax, yMax].every((value) => Number.isFinite(Number(value)))) return null;
    return {
        ...detection,
        class_name: "knife",
        polygon: [[xMin, yMin], [xMax, yMin], [xMax, yMax], [xMin, yMax]],
    };
};

const getInstanceSegmentation = (frame) => {
    const instances = Array.isArray(frame?.predictions?.["instance-segmentation"])
        ? frame.predictions["instance-segmentation"]
        : [];
    const detections = frame?.predictions?.["object-detection"] ?? frame?.predictions?.knife;
    if (!Array.isArray(detections)) return instances;
    return [
        ...instances.filter((item) => normalizeClassName(item?.class_name) !== "knife"),
        ...detections.map(toKnifeInstance).filter(Boolean),
    ];
};

export const MAX_MISSED_KNIFE_FRAMES = 10;

const getAttackerCandidate = (frame, people, knives, requireKnifeOverlap) => {
    const personDistances = people.map((person) => ({
        ...person,
        distance: Math.min(...knives.map((knife) => polygonDistance(knife.polygon, person.item.polygon))),
    }));
    const closestDistance = Math.min(...personDistances.map(({ distance }) => distance));
    if (requireKnifeOverlap && closestDistance > 1e-7) return null;

    const closestPeople = personDistances.filter(({ distance }) => (
        Math.abs(distance - closestDistance) <= 1e-7
    ));
    if (closestPeople.length === 1) return closestPeople[0];

    const wristDistances = getWristDistances(frame, people, knives);
    const wristRankedPeople = closestPeople
        .map((person) => ({
            ...person,
            wristDistance: wristDistances.get(person.identity) ?? Infinity,
        }))
        .filter(({ wristDistance }) => Number.isFinite(wristDistance))
        .sort((first, second) => first.wristDistance - second.wristDistance);

    return wristRankedPeople.length > 1
        && wristRankedPeople[0].wristDistance < wristRankedPeople[1].wristDistance - 1e-7
        ? wristRankedPeople[0]
        : null;
};

const getNearestVictimIdentity = (people, knives, attackerIdentity, currentVictimIdentity) => {
    const nonAttackers = people.filter(({ identity }) => identity !== attackerIdentity);
    if (!nonAttackers.length) return null;

    const distances = nonAttackers.map((person) => ({
        ...person,
        distance: Math.min(...knives.map((knife) => polygonDistance(knife.polygon, person.item.polygon))),
    }));
    const closestDistance = Math.min(...distances.map(({ distance }) => distance));
    const closestPeople = distances.filter(({ distance }) => (
        Math.abs(distance - closestDistance) <= 1e-7
    ));
    if (closestPeople.length === 1) return closestPeople[0].identity;
    return closestPeople.some(({ identity }) => identity === currentVictimIdentity)
        ? currentVictimIdentity
        : null;
};

/**
 * Enrich ordered multi-model frames with optional roles and possible-attack
 * evidence. Once a possible attack starts, attacker identity persists through
 * short knife-detection gaps and the nearest non-attacker is the potential
 * victim. Instance-segmentation track IDs identify people across frames; pose tracker
 * IDs are intentionally not used for cross-model matching.
 *
 * @param {Array<object>} frames - Ordered multi-model prediction frames.
 * @param {{ requireKnifeOverlapForAttacker?: boolean }} [options] - Require knife/person overlap before assigning an attacker.
 * @returns {Array<object>} New frames with frontend-derived behavior annotations.
 */
export const analyzeKnifeAttackFrames = (frames, options = {}) => {
    let attackerIdentity = null;
    let victimIdentity = null;
    let attackActive = false;
    let missedKnifeFrames = 0;
    const attackedIdentities = new Set();

    return (Array.isArray(frames) ? frames : []).map((frame, frameIndex) => {
        const instanceSegmentations = getInstanceSegmentation(frame);
        const people = instanceSegmentations
            .map((item, index) => ({ item, index, identity: getIdentity(item, index) }))
            .filter(({ item }) => normalizeClassName(item?.class_name) === "person"
                && isValidPolygon(item?.polygon));
        const knives = instanceSegmentations.filter((item) => (
            normalizeClassName(item?.class_name) === "knife" && isValidPolygon(item?.polygon)
        ));
        const knifeContactIdentities = new Set(
            people
                .filter(({ item }) => knives.some((knife) => polygonsOverlap(knife.polygon, item.polygon)))
                .map(({ identity }) => identity),
        );
        const hasAttackEvidence = people.length > 1 && knifeContactIdentities.size > 0;

        if (knives.length) {
            missedKnifeFrames = 0;
            if (!attackActive && hasAttackEvidence) attackActive = true;
        } else if (attackActive) {
            missedKnifeFrames += 1;
            if (missedKnifeFrames > MAX_MISSED_KNIFE_FRAMES) {
                attackActive = false;
                attackerIdentity = null;
                victimIdentity = null;
                attackedIdentities.clear();
            }
        }

        if (attackActive && knives.length && people.length) {
            if (!attackerIdentity) {
                const candidate = getAttackerCandidate(
                    frame,
                    people,
                    knives,
                    options.requireKnifeOverlapForAttacker,
                );
                attackerIdentity = candidate?.identity ?? null;
            }
            if (attackerIdentity) {
                const nearestVictimIdentity = getNearestVictimIdentity(
                    people,
                    knives,
                    attackerIdentity,
                    victimIdentity,
                );
                victimIdentity = nearestVictimIdentity;
                if (victimIdentity === attackerIdentity) victimIdentity = null;
            }
        }

        const frameAttacker = people.find(({ identity }) => identity === attackerIdentity);
        const frameVictim = people.find(({ identity }) => identity === victimIdentity);
        const attackedThisFrame = [];
        const annotatedInstanceSegmentations = instanceSegmentations.map((item) => {
            const person = people.find(({ item: candidate }) => candidate === item);
            if (!person) return item;
            const isAttacker = attackActive && person.identity === attackerIdentity;
            const isVictim = attackActive
                && person.identity === victimIdentity
                && person.identity !== attackerIdentity;
            const overlapsKnife = knifeContactIdentities.has(person.identity);
            const attackDetected = isVictim
                && !attackedIdentities.has(person.identity)
                && overlapsKnife;

            if (attackDetected) {
                attackedIdentities.add(person.identity);
                attackedThisFrame.push(person.item.track_id ?? null);
            }

            return {
                ...item,
                behaviorRole: isAttacker ? "attacker" : isVictim ? "victim" : null,
                attackDetected,
            };
        });
        const victimTrackIds = attackActive && victimIdentity && victimIdentity !== attackerIdentity
            ? [frameVictim?.item.track_id ?? getTrackId(victimIdentity)]
            : [];
        const finalInstanceSegmentations = annotatedInstanceSegmentations.map((item) => (
            normalizeClassName(item?.class_name) === "knife"
                ? {
                    ...item,
                    heldByTrackId: attackActive
                        ? frameAttacker?.item.track_id ?? getTrackId(attackerIdentity)
                        : null,
                }
                : item
        ));
        const predictions = Object.fromEntries(
            Object.entries(frame?.predictions ?? {}).map(([model, items]) => {
                if (model !== "instance-segmentation") return [model, items];
                return [model, finalInstanceSegmentations];
            }),
        );

        return {
            ...frame,
            predictions: Array.isArray(frame?.predictions?.["instance-segmentation"]) ? predictions : {
                ...(frame?.predictions ?? {}),
                "instance-segmentation": finalInstanceSegmentations,
            },
            behavior: {
                attackerTrackId: attackActive
                    ? frameAttacker?.item.track_id ?? getTrackId(attackerIdentity)
                    : null,
                victimTrackIds,
                attackedVictimTrackIds: attackedThisFrame,
                attackDetected: attackActive,
                frameIndex,
            },
        };
    });
};
