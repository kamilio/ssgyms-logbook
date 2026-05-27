import { type BrowserAuthenticator } from "./browser-login.js";
import { type SsgymsClient } from "./client.js";
import { type CredentialProvider } from "./credentials.js";
export interface LogbookServices {
    client?: SsgymsClient;
    credentials?: CredentialProvider;
    browserAuthenticator?: BrowserAuthenticator;
    readStdin?: () => Promise<string>;
}
export declare const logbook: import("toolcraft").Group<LogbookServices> & {
    readonly __agentKitGroupTypeInfo: import("toolcraft").GroupTypeInfo<LogbookServices, "ssgyms-logbook", readonly [import("toolcraft").Command<LogbookServices, import("toolcraft-schema").ObjectSchema<{}>, undefined, import("./client.js").StoredWorkout[]> & {
        readonly __agentKitCommandTypeInfo: import("toolcraft").CommandTypeInfo<"list-workouts", import("toolcraft-schema").ObjectSchema<{}>, import("./client.js").StoredWorkout[], readonly ["cli", "mcp", "sdk"], undefined>;
    }, import("toolcraft").Command<LogbookServices, import("toolcraft-schema").ObjectSchema<{
        readonly date: import("toolcraft-schema").StringSchema;
        readonly exercise: import("toolcraft-schema").ArraySchema<import("toolcraft-schema").StringSchema>;
        readonly note: import("toolcraft-schema").OptionalSchema<import("toolcraft-schema").StringSchema>;
    }>, undefined, import("./client.js").StoredWorkout> & {
        readonly __agentKitCommandTypeInfo: import("toolcraft").CommandTypeInfo<"create-workout", import("toolcraft-schema").ObjectSchema<{
            readonly date: import("toolcraft-schema").StringSchema;
            readonly exercise: import("toolcraft-schema").ArraySchema<import("toolcraft-schema").StringSchema>;
            readonly note: import("toolcraft-schema").OptionalSchema<import("toolcraft-schema").StringSchema>;
        }>, import("./client.js").StoredWorkout, readonly ["cli", "mcp", "sdk"], undefined>;
    }, import("toolcraft").Command<LogbookServices, import("toolcraft-schema").ObjectSchema<{
        readonly id: import("toolcraft-schema").StringSchema;
        readonly exercise: import("toolcraft-schema").ArraySchema<import("toolcraft-schema").StringSchema>;
        readonly note: import("toolcraft-schema").OptionalSchema<import("toolcraft-schema").StringSchema>;
    }>, undefined, {
        id: string;
    } & import("./client.js").WorkoutUpdate> & {
        readonly __agentKitCommandTypeInfo: import("toolcraft").CommandTypeInfo<"log-workout", import("toolcraft-schema").ObjectSchema<{
            readonly id: import("toolcraft-schema").StringSchema;
            readonly exercise: import("toolcraft-schema").ArraySchema<import("toolcraft-schema").StringSchema>;
            readonly note: import("toolcraft-schema").OptionalSchema<import("toolcraft-schema").StringSchema>;
        }>, {
            id: string;
        } & import("./client.js").WorkoutUpdate, readonly ["cli", "mcp", "sdk"], undefined>;
    }, import("toolcraft").Command<LogbookServices, import("toolcraft-schema").ObjectSchema<{
        readonly id: import("toolcraft-schema").StringSchema;
    }>, undefined, {
        id: string;
        deleted: true;
    }> & {
        readonly __agentKitCommandTypeInfo: import("toolcraft").CommandTypeInfo<"delete-workout", import("toolcraft-schema").ObjectSchema<{
            readonly id: import("toolcraft-schema").StringSchema;
        }>, {
            id: string;
            deleted: true;
        }, readonly ["cli", "mcp", "sdk"], undefined>;
    }, import("toolcraft").Group<LogbookServices> & {
        readonly __agentKitGroupTypeInfo: import("toolcraft").GroupTypeInfo<LogbookServices, "auth", readonly [import("toolcraft").Command<LogbookServices, import("toolcraft-schema").ObjectSchema<{
            readonly timeoutSeconds: import("toolcraft-schema").OptionalSchema<import("toolcraft-schema").NumberSchema>;
        }>, undefined, {
            authenticated: true;
            email?: string;
            storage: "encrypted-file";
            userId: string;
        }> & {
            readonly __agentKitCommandTypeInfo: import("toolcraft").CommandTypeInfo<"login", import("toolcraft-schema").ObjectSchema<{
                readonly timeoutSeconds: import("toolcraft-schema").OptionalSchema<import("toolcraft-schema").NumberSchema>;
            }>, {
                authenticated: true;
                email?: string;
                storage: "encrypted-file";
                userId: string;
            }, readonly ["cli"], undefined>;
        }, import("toolcraft").Command<LogbookServices, import("toolcraft-schema").ObjectSchema<{
            readonly refreshToken: import("toolcraft-schema").OptionalSchema<import("toolcraft-schema").StringSchema>;
            readonly tokenStdin: import("toolcraft-schema").OptionalSchema<import("toolcraft-schema").BooleanSchema>;
        }>, undefined, {
            stored: true;
            file: string;
        }> & {
            readonly __agentKitCommandTypeInfo: import("toolcraft").CommandTypeInfo<"save", import("toolcraft-schema").ObjectSchema<{
                readonly refreshToken: import("toolcraft-schema").OptionalSchema<import("toolcraft-schema").StringSchema>;
                readonly tokenStdin: import("toolcraft-schema").OptionalSchema<import("toolcraft-schema").BooleanSchema>;
            }>, {
                stored: true;
                file: string;
            }, readonly ["cli"], undefined>;
        }, import("toolcraft").Command<LogbookServices, import("toolcraft-schema").ObjectSchema<{}>, undefined, {
            authenticated: true;
            userId: string;
        }> & {
            readonly __agentKitCommandTypeInfo: import("toolcraft").CommandTypeInfo<"status", import("toolcraft-schema").ObjectSchema<{}>, {
                authenticated: true;
                userId: string;
            }, readonly ["cli"], undefined>;
        }, import("toolcraft").Command<LogbookServices, import("toolcraft-schema").ObjectSchema<{}>, undefined, {
            removed: true;
        }> & {
            readonly __agentKitCommandTypeInfo: import("toolcraft").CommandTypeInfo<"remove", import("toolcraft-schema").ObjectSchema<{}>, {
                removed: true;
            }, readonly ["cli"], undefined>;
        }], readonly ["cli"], undefined>;
    }], readonly ["cli", "mcp", "sdk"], undefined>;
};
