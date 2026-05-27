#!/usr/bin/env node
import { runMCP } from "toolcraft/mcp";
import { logbook } from "./commands.js";
await runMCP(logbook, {
    name: "ssgyms-logbook",
    version: "0.1.0",
    omitRootToolNamePrefix: true,
    tools: [
        "list_workouts",
        "create_workout",
        "log_workout",
        "delete_workout"
    ]
});
