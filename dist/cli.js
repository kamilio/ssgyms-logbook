#!/usr/bin/env node
import { runCLI } from "toolcraft/cli";
import { logbook } from "./commands.js";
await runCLI(logbook, {
    version: "0.1.0",
    rootDisplayName: "ssgyms-logbook",
    rootUsageName: "ssgyms-logbook"
});
