import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

const taskPath = path.join(__dirname, '..', '..', 'out', 'tasks', 'whoami', 'whoami-v0', 'index.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('authenticationType', 'SPN');
tmr.setInput('url', '');
tmr.setInput('username', '');
tmr.setInput('password', '');

tmr.run();
