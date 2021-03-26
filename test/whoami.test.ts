import * as path from 'path';
import { expect } from 'chai';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('WhoAmI Tests', function () {
  it('should succeed with simple inputs', function (done: Mocha.Done) {

    const tp = path.join(__dirname, 'mock', 'whoami-success.mock.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    expect(tr.succeeded).to.be.true;
    expect(tr.warningIssues.length).to.eq(0);
    expect(tr.errorIssues.length).to.eq(0);
    done();
  });
});
