import { type CredentialProvider } from "./credentials.js";
import type { Workout } from "./workouts.js";
export interface StoredWorkout extends Workout {
    id: string;
}
export interface WorkoutUpdate {
    exercises: Workout["exercises"];
    isCompleated: true;
    note?: string;
}
export interface SsgymsClient {
    listWorkouts(): Promise<StoredWorkout[]>;
    createWorkout(workout: Workout): Promise<StoredWorkout>;
    logWorkout(id: string, update: WorkoutUpdate): Promise<{
        id: string;
    } & WorkoutUpdate>;
    deleteWorkout(id: string): Promise<{
        id: string;
        deleted: true;
    }>;
    validateAuthentication(): Promise<{
        authenticated: true;
        userId: string;
    }>;
}
interface ClientOptions {
    fetch?: typeof globalThis.fetch;
    credentials?: CredentialProvider;
}
export declare function createSsgymsClient(options?: ClientOptions): SsgymsClient;
export {};
