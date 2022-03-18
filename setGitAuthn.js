// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Bootstrap authentication for npm packages pulled from the Github package feed requireing authN:
// this module needs to be executable with just plain nodejs runtime modules
// do not require any modules that require npm install before
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const p = require('process');

async function git(args) {
    args.unshift('git');
    const {stdout, stderr } = await exec(args.join(' '));
    return {stdout: stdout, stderr: stderr};
}

async function setGitAuthN() {
    const repoUrl = 'https://github.com';
    console.log(`argv: ${p.argv.length}`);
    if (p.argv.length != 3) {
        throw new Error(`Must specify a single script parameter repoToken with read and push rights to ${repoUrl}!`);
    }
    const repoToken = p.argv[2];
    console.log(`setting up auth for github packages: token length=${repoToken.length}`);
    const bearer = `AUTHORIZATION: basic ${Buffer.from(`PAT:${repoToken}`).toString('base64')}`;
    await git(['config', '--local', `http.${repoUrl}/.extraheader`, `"${bearer}"`]);
    await git(['config', '--local', 'user.email', 'capisvaatdev@microsoft.com' ]);
    await git(['config', '--local', 'user.name', '"DPT Tools Dev Team"' ]);
}

(async () => {
  setGitAuthN();
})().catch(error => {
  console.error(error);
  p.exit(1);
});
