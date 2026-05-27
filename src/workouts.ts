import { randomUUID } from "node:crypto";
import { UserError } from "toolcraft";

export interface ExerciseSet {
  pos: number;
  sets: number;
  reps: number;
  weight: number;
}

export interface Exercise {
  id: string;
  title: string;
  pos: number;
  mandatory?: boolean;
  exerciseSets: Record<string, ExerciseSet>;
}

export interface Workout {
  createdAt: string;
  date: string;
  timestamp: number;
  exercises: Record<string, Exercise>;
  isCompleated?: boolean;
  note?: string;
}

export interface WorkoutSetEntry {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
}

const EXERCISES: Record<string, Omit<Exercise, "id" | "exerciseSets">> = {
  squat: { title: "Squat", pos: 0, mandatory: true },
  bench: { title: "Bench", pos: 1, mandatory: true },
  press: { title: "Press", pos: 2, mandatory: true },
  deadlift: { title: "Deadlift", pos: 3, mandatory: true },
  chins: { title: "Chins", pos: 4, mandatory: true },
  lat_pulldown: { title: "Lat Pulldown", pos: 5, mandatory: true },
  power_clean: { title: "Power Clean", pos: 6, mandatory: true },
  barbell_rows: { title: "Barbell Rows", pos: 7 },
  bodyweight_row: { title: "Bodyweight Row", pos: 8 },
  clean: { title: "Clean", pos: 9 },
  clean_jerk: { title: "Clean and Jerk", pos: 10 },
  close_grip_bench_press: { title: "Close Grip Bench Press", pos: 11 },
  curls: { title: "Curls", pos: 12 },
  deficit_deadlift: { title: "Deficit Deadlift", pos: 13 },
  dips: { title: "Dips", pos: 14 },
  echo_bike: { title: "Echo Bike", pos: 15 },
  front_squat: { title: "Front Squat", pos: 16 },
  halting_deadlift: { title: "Halting Deadlift", pos: 17 },
  high_bar_squat: { title: "High Bar Squat", pos: 18 },
  jerk: { title: "Jerk", pos: 19 },
  lyingTricepExtensions: { title: "Lying Tricep Extensions", pos: 20 },
  paused_bench: { title: "Paused Bench", pos: 21 },
  paused_deadlift: { title: "Paused Deadlift", pos: 22 },
  paused_s: { title: "Paused Squat", pos: 23 },
  pin_bench_press: { title: "Pin Bench Press", pos: 24 },
  pin_press: { title: "Pin Press", pos: 25 },
  pin_squat: { title: "Pin Squat", pos: 26 },
  power_snatch: { title: "Power Snatch", pos: 27 },
  prowler: { title: "Prowler", pos: 28 },
  pullups: { title: "Pullups", pos: 29 },
  rdl: { title: "RDL", pos: 30 },
  rack_pull: { title: "Rack Pull", pos: 31 },
  snatch: { title: "Snatch", pos: 32 },
  snatch_grip_deadlift: { title: "Snatch Grip Deadlift", pos: 33 },
  stiff_legged_deadlift: { title: "Stiff Legged Deadlift", pos: 34 },
  strict_press: { title: "Strict Press", pos: 35 }
};

export function parseExerciseEntry(entry: string): WorkoutSetEntry {
  const separatorIndex = entry.indexOf("=");
  const setsSeparatorIndex = entry.indexOf("x", separatorIndex + 1);
  const weightSeparatorIndex = entry.indexOf("@", setsSeparatorIndex + 1);
  if (separatorIndex <= 0 || setsSeparatorIndex <= separatorIndex + 1 || weightSeparatorIndex <= setsSeparatorIndex + 1) {
    throw new UserError(`Invalid exercise entry "${entry}". Expected exercise=setsxreps@weight, for example squat=3x5@225.`);
  }

  const exerciseId = entry.slice(0, separatorIndex);
  if (!EXERCISES[exerciseId]) {
    throw new UserError(`Unknown exercise "${exerciseId}".`);
  }
  const sets = Number(entry.slice(separatorIndex + 1, setsSeparatorIndex));
  const reps = Number(entry.slice(setsSeparatorIndex + 1, weightSeparatorIndex));
  const weight = Number(entry.slice(weightSeparatorIndex + 1));
  if (![sets, reps, weight].every(Number.isFinite) || sets < 0 || reps < 0 || weight < 0) {
    throw new UserError(`Invalid values in exercise entry "${entry}".`);
  }
  return { exerciseId, sets, reps, weight };
}

export function buildWorkoutExercises(entries: string[]): Record<string, Exercise> {
  if (entries.length === 0) {
    throw new UserError("Provide at least one exercise entry.");
  }
  return Object.fromEntries(entries.map((entry) => {
    const parsed = parseExerciseEntry(entry);
    const definition = EXERCISES[parsed.exerciseId];
    return [parsed.exerciseId, {
      id: parsed.exerciseId,
      ...definition,
      exerciseSets: {
        [randomUUID()]: { pos: 1, sets: parsed.sets, reps: parsed.reps, weight: parsed.weight }
      }
    }];
  }));
}

export function buildWorkout(options: { date: string; entries: string[]; note?: string; complete?: boolean; now?: Date }): Workout {
  const date = parseWorkoutDate(options.date);
  const now = options.now ?? new Date();
  return {
    exercises: buildWorkoutExercises(options.entries),
    date: formatLocalDateTime(date),
    timestamp: Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 1000),
    createdAt: now.toISOString(),
    ...(options.note ? { note: options.note } : {}),
    ...(options.complete ? { isCompleated: true } : {})
  };
}

function formatLocalDateTime(date: Date): string {
  const timezoneOffsetMinutes = -date.getTimezoneOffset();
  const timezoneSign = timezoneOffsetMinutes >= 0 ? "+" : "-";
  const absoluteTimezoneOffset = Math.abs(timezoneOffsetMinutes);
  const timezoneHours = String(Math.floor(absoluteTimezoneOffset / 60)).padStart(2, "0");
  const timezoneMinutes = String(absoluteTimezoneOffset % 60).padStart(2, "0");
  const localDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
  return `${localDate}T00:00:00${timezoneSign}${timezoneHours}:${timezoneMinutes}`;
}

function parseWorkoutDate(value: string): Date {
  const segments = value.split("-").map(Number);
  if (segments.length !== 3 || segments.some((segment) => !Number.isInteger(segment))) {
    throw new UserError(`Invalid workout date "${value}". Expected YYYY-MM-DD.`);
  }
  const [year, month, day] = segments as [number, number, number];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new UserError(`Invalid workout date "${value}". Expected YYYY-MM-DD.`);
  }
  return date;
}
