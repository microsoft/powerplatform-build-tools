// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const argv = require('yargs').argv;

async function git(args) {
    args.unshift('git');
    const {stdout, stderr } = await exec(args.join(' '));
    return {stdout: stdout, stderr: stderr};
}

async function setGitAuthN() {
    const repoUrl = 'https://github.com';
    const repoToken = argv.repoToken;
    if (!repoToken) {
        throw new Error(`Must specify parameter --repoToken with read and push rights to ${repoUrl}!`);
    }
    const bearer = `AUTHORIZATION: basic ${Buffer.from(`PAT:${repoToken}`).toString('base64')}`;
    await git(['config', '--local', `http.${repoUrl}/.extraheader`, `"${bearer}"`]);
    await git(['config', '--local', 'user.email', 'capisvaatdev@microsoft.com' ]);
    await git(['config', '--local', 'user.name', '"DPT Tools Dev Team"' ]);
}

module.exports = setGitAuthN;
