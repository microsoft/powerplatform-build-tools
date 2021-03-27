import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

const taskPath = path.join(__dirname, '..', '..', 'extension', 'whoami', 'whoami-v0', 'index.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('authenticationType', 'SPN');
tmr.setInput('PowerPlatformEnvironment', 'Contoso');
tmr.setInput('PowerPlatformSPN', 'SPN-Test');

tmr.run();
