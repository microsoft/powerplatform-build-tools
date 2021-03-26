import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

const taskPath = path.join(__dirname, '..', '..', 'extension', 'whoami', 'whoami-v0', 'index.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
console.log(taskPath);
tmr.setInput('authenticationType', 'testAuth');
tmr.run();
