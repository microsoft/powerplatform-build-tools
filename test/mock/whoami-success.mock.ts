require("dotenv/config"); // Needed to require to initialize .env
import { TaskMockRunner } from "azure-pipelines-task-lib/mock-run";
import { env } from "process";
import path = require("path");

const taskPath = path.join(
  __dirname,
  "..",
  "..",
  "src",
  "tasks",
  "whoami",
  "whoami-v0",
  "index.ts"
);
const mockRunner = new TaskMockRunner(taskPath);

mockRunner.setInput("authenticationType", "PowerPlatformEnvironment");
mockRunner.registerMock("azure-pipelines-task-lib", {
  getEndpointUrl: () => env.URL ?? "",
  getEndpointAuthorization: () => ({
    parameters: {
      username: env.PPUSERNAME ?? "",
      password: env.PASSWORD ?? "",
    },
  }),
});

mockRunner.run();
