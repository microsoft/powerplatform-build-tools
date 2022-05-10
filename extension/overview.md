**Power Platform Build Tools**
==============================

Overview
--------

Use Power Platform Build Tools to automate common build and deployment tasks
related to Power Platform. This includes synchronization of solution metadata
(a.k.a. solutions) between development environments and source control,
generating build artifacts, deploying to downstream environments,
provisioning/de-provisioning of environments, and the ability to perform
static analysis checks against your solution using the PowerApps checker
service.

Learn more about the Build Tools [here](https://aka.ms/buildtoolsdoc).

## Feedback & Questions

Please use the issues tracker in the home repo: <https://github.com/microsoft/powerplatform-build-tools/issues>


# Release Notes
{{NextReleaseVersion}}:
- Tasks are now implemented using [PowerPlatform CLI](https://aka.ms/PowerPlatformCLI)
- Crossplatform support: Tasks can run on either Windows or Linux build agents
  (exception: PackageDeploy requires Windows)
- ToolInstaller task: still required as first task, but it will no longer require runtime
  access to PowershellGallery nor nuget.org feeds
- All tasks are backwards compatible to their previous PowerShell implementation (version 1.0.41 and older)

1.0.41:
- add Staging Solution API for ImportSolution with EnvironmentVariables

1.0.40:
- updated ToolInstaller default versions to latest PowerApps.Admin module and SolutionPackager package
- add support for modern SiteMap (requires SolutionPackager from CoreTools pkg 9.1.0.90 or newer)
- update to latest MSAL & latest Dataverse service client with fix for MaxConnectionTimeout (now 10 min) for task DeleteSolution
- fix DeployPackage: renew OAuth access token if package deployment exceeds 60 min
- New-CrmServicePrincipal.ps1 script now creates secrets with a default expiration date (see https://aka.ms/buildtools-spn)

1.0.35:
- PowerApps Checker: new optional parameter to exclude files from checker
- CreateEnvironment: only warn if region, language, currency or template key cannot be enumerate before actual createEnv call to BAP
- Update ToolInstaller to latest modules & packages
- preview support for ImportSolution with ConnectionReferences and EnvironmentVariables, see 'Deployment Settings File' parameter
- update to linking with latest PackageDeployer nupkg to avoid MethodNotFoundException when PD sets new DeploymentStage property in ImportProgressStatus
- fix silent crash within PowerShell in DeployPackage (type conversion to CrmServiceClient failed when assigning CrmConnection cmdlet property)

1.0.23:
- Apply Solution Upgrade task:
    - New task to apply solution upgrade after solution import task has been used with the "Import as holding solution" option to stage the solution for upgrade
- Delete Solution task:
    - New task to delete solution
- Update ToolInstaller to latest modules & packages
- Enabled Service Principal based authentication for Restore environment management tasks (ResetEnv with SPN authN is still being worked on)

1.0.22:
- Fix DeployPackage error: Cannot load package info/method not found error in CoreObjects
- Updating to default ToolInstaller to latest PackageDeploy PS module and linking instance tasks with latest connect control

1.0.20:
- Avoid PSGallery module and Nuget pkg install errors, ensure the build agent user's PS session has latest modules for PackageManagement and PowerShellGet

1.0.19:
- Fix ToolInstaller: limit nuget.org calls to API V2, since PS system package provider has no support for V3 API

1.0.17:
- All environment CRUD tasks now solely depend on PowerApps.Administration module (OnlineManagementAPI is retired)
  ToolInstaller task will ignore version for the OnlineManagemementAPI module
- Deploy Package task timeout issue fixed: provides an option to increase the default 60 minutes timeout
- Create, Copy, Restore, and Reset Environment tasks create/update the following newly added pipeline variables:
  - "BuildTools.OrganizationId" pipeline variable with the connected environment's organization id
  - "BuildTools.OrgUniqueName" pipeline variable with the connected environment's unique name
- Create Environment task:
  - editable option for Environment type, Region, Language, and Currency input fields
  - removed "Developer Edition" app from app/templates list
  - added new environment type "Trial (subscription-based)"
- Power Platform Checker:
  - added geography support for Germany

- Known issue: ResetEnvironment with appID/SPN authN will result in the AppUser being removed;
    service side fix is being worked on
  mitigation: use username/password service connection for now or Backup/Restore

1.0.13
- Export solution task 4 minute timout failures fixed:
  Export is now working asynchronously by default:
  - available in all public clouds now, except in scale groups for enterprises who opted in for slow-deployments
  - will become available in sovereign clouds as the CDS service deployments continue over the next weeks
  - Note: an environment that has not received the CDS service update will fail with a 400 Bad Request error. Uncheck the asynchronous option to mitigate.
- Create Environment task:
  - options to provide the app name(s) that are not available in the template/app list
  - enabled app/template list for both Sandbox and Production environment types
- Backup, restore, copy tasks no longer require full TenantAdmin privilege: SystemAdmin on the environment is sufficient. This is a partial fix as long as task authenticates with username/password; when using AppID/
ClientSecret, the user must have TenantAdmin privileges for now
- Added log information such as connection, logged-in user and organization details
- Updated ToolInstaller default version of following runtime dependencies to latest versions
  - PowerAppsAdminVersion: 2.0.76
  - CrmSdkCoreToolsVersion: 9.1.0.49

1.0.8:
- Enabled Service Principal based authentication for Create/Delete/Copy/Backup/Restore environment management tasks
- Service Principal is currently not available for Reset environment task. Only username/password is supported

1.0.4:
- Surface AAD errors if username/password authentication requires MFA (avoid task time out)
- Fix support/feedback email

1.0.3
- Updated ToolInstaller default version of runtime dependencies to latest versions
- Pack/UnpackSolution tasks: handle file/folder paths with spaces (and validated other tasks tolerate paths with spaces)
- Enable TiP endpoint support: all tasks can connect to TiP endpoints as well

1.0.1
First General Availability release:
- 2 choices for task authentication with Power Platform endpoints:
  - Azure DevOps ServiceConnection "Power Platform" to authenticate with Service Principal/Client Secret;
    this is the preferred way to authenticate in an MFA-enabled tenant
  - Generic ServiceConnection using username/password authentication
    (Note: this authentication is not MFA capable since Azure DevOps tasks run non-interactive)
- Create and configure Azure AppId/Service Principal & ClientSecret with <https://aka.ms/buildtools-spn>
- Pipeline variable "BuildTools.EnvironmentUrl":
  - Create, Copy and Restore Environment tasks create/overwrite "BuildTools.EnvironmentUrl" pipeline variable to store new environment url
  - All other tasks reference environment url from "BuildTools.EnvironmentUrl" pipeline variable if defined, otherwise reference the url from the active ServiceConnection
