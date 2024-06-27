# Contributing

This project will welcome code and PR contributions and suggestions in the near future.  While we are excited to accept code contributions, there are other valuable forms of, including filing [issues](https://github.com/microsoft/powerplatform-build-tools/issues) and engaging in [discussions](https://github.com/microsoft/powerplatform-build-tools/discussions).  Many open source projects ask for enhancement suggestions in the form of issues.  We prefer that you start a discussion instead of creating enhancement issues.

Once this project is ready to welcome contributions and suggestions:  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit <https://cla.opensource.microsoft.com>.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

## Setting Up Local Dev Environment

Windows, macOS or Linux:

- [Node.js LTS (currently v16)](https://nodejs.org/en/download/)
- Install the [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
  - Add [Azure DevOps Extension](https://github.com/Azure/azure-devops-cli-extension)
    - ```az extension add --name azure-devops```
- gulp CLI: ```npm install -g gulp-cli```
- [git](https://git-scm.com/downloads)
- [VS Code](https://code.visualstudio.com/Download) or your different favorite editor
- recommended VSCode extensions:
  - [EditorConfig for VS Code (editorconfig.editorconfig)](https://github.com/editorconfig/editorconfig-vscode)
  - [ESLint (dbaeumer.vscode-eslint)](https://github.com/Microsoft/vscode-eslint)
  - [GitLens (eamodio.gitlens)](https://github.com/eamodio/vscode-gitlens)
  - [markdownlint (davidanson.vscode-markdownlint)](https://github.com/DavidAnson/vscode-markdownlint)

  - TEMPORARY:
    - Create a PAT for the Azure DevOps org ```msazure``` with scope: package(read) and add it as local environment variable.

    ```Powershell
    [Environment]::SetEnvironmentVariable('AZ_DevOps_Read_PAT', '<yourPAT>', [EnvironmentVariableTarget]::User)
    ```

    - Create a PAT in GitHub to read packages, and enable SSO for the microsoft organization. Then add it to your *~/.npmrc* file or use the `npm login` command as documented [here](https://docs.github.com/en/packages/guides/configuring-npm-for-use-with-github-packages#authenticating-with-a-personal-access-token). This will only be needed until the `@microsoft/powerplatform-cli-wrapper` repo is made public.

If developing on Linux or macOS, you will also need to install `git-lfs`.  (It is prepackaged with the Git installer for Windows.)  Follow the [instructions here](https://docs.github.com/en/github/managing-large-files/installing-git-large-file-storage) for your environment.

## Build and Run

Clone, restore modules, build and run:

```bash
git clone https://github.com/microsoft/powerplatform-build-tools.git pp-build-tools
cd pp-build-tools
npm ci
gulp ci
```

## How to make GitHub Actions and Build Tools compatible with latest PAC CLI?

[Please refer steps in Cli-Wrapper](https://github.com/microsoft/powerplatform-cli-wrapper/blob/main/README.md)
