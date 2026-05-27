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
export declare function parseExerciseEntry(entry: string): WorkoutSetEntry;
export declare function buildWorkoutExercises(entries: string[]): Record<string, Exercise>;
export declare function buildWorkout(options: {
    date: string;
    entries: string[];
    note?: string;
    complete?: boolean;
    now?: Date;
}): Workout;
