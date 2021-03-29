require('dotenv/config'); // Needed to require to initialize .env
import tmrm = require('azure-pipelines-task-lib/mock-run');
import { env } from 'process';
import path = require('path');

const taskPath = path.join(__dirname, '..', '..', 'out', 'tasks', 'whoami', 'whoami-v0', 'index.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('authenticationType', 'PowerPlatformEnvironment');
tmr.setInput('url', env.URL ?? "");
tmr.setInput('username', env.PPUSERNAME ?? ""); // username is env for logged in user of local machine.
tmr.setInput('password', env.PASSWORD ?? "");

tmr.run();
