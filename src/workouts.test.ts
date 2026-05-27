import { describe, expect, it } from "vitest";
import { buildWorkout, buildWorkoutExercises, parseExerciseEntry } from "./workouts.js";

describe("workout payloads", () => {
  it("parses compact set notation", () => {
    expect(parseExerciseEntry("squat=3x5@240")).toEqual({ exerciseId: "squat", sets: 3, reps: 5, weight: 240 });
  });

  it("builds app-shaped exercise maps", () => {
    const exercises = buildWorkoutExercises(["squat=3x5@240", "press=3x5@100"]);
    expect(exercises.squat).toMatchObject({ id: "squat", title: "Squat", pos: 0, mandatory: true });
    expect(Object.values(exercises.squat.exerciseSets)[0]).toEqual({ pos: 1, sets: 3, reps: 5, weight: 240 });
  });

  it("creates completed log payloads when requested", () => {
    const workout = buildWorkout({ date: "2026-06-01", entries: ["deadlift=1x5@315"], complete: true, now: new Date("2026-05-22T19:00:00.000Z") });
    const timezoneOffsetMinutes = -new Date(2026, 5, 1).getTimezoneOffset();
    const timezoneSign = timezoneOffsetMinutes >= 0 ? "+" : "-";
    const absoluteTimezoneOffset = Math.abs(timezoneOffsetMinutes);
    const timezone = `${timezoneSign}${String(Math.floor(absoluteTimezoneOffset / 60)).padStart(2, "0")}:${String(absoluteTimezoneOffset % 60).padStart(2, "0")}`;
    expect(workout).toMatchObject({ date: `2026-06-01T00:00:00${timezone}`, timestamp: Date.UTC(2026, 5, 1) / 1000, isCompleated: true });
  });
});
