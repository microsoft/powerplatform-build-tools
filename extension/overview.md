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
- pac CLI 1.30.5 (January Refresh), [Release Notes on nuget.org](https://www.nuget.org/packages/Microsoft.PowerApps.CLI)
- fixes authentication bug for users of the China cloud

2.0.49:
- pac CLI 1.29.11 (October Refresh), [Release Notes on nuget.org](https://www.nuget.org/packages/Microsoft.PowerApps.CLI)

2.0.47:
- pac CLI 1.28.3 (September Refresh), [Release Notes on nuget.org](https://www.nuget.org/packages/Microsoft.PowerApps.CLI)
- `Power Platform Import Solution` now supports `StageAndUpgrade` to import the solution as Holding and immediately queue as an Upgrade in a single command.  Previously, one would need to import as holding first, then run the `Power Platform Apply Solution Upgrade` as a second operation

2.0.42:
- pac CLI 1.27.6 (August Refresh), [Release Notes on nuget.org](https://www.nuget.org/packages/Microsoft.PowerApps.CLI)
- `Power Platform Copy Environment` and `Power Platform Restore Environment` now support skipping audit data [#500](https://github.com/microsoft/powerplatform-build-tools/pull/500)
- `Power Platform Copy Environment` and `Power Platform Restore Environment` can now override the default 60 minute async timeout [#521](https://github.com/microsoft/powerplatform-build-tools/pull/521)
- `Power Platform Deploy Package` now supports outputing the Package Deployment logs to the console [#503](https://github.com/microsoft/powerplatform-build-tools/pull/503)
- `Power Platform Set Connection Variables` sets the Environment URL as a variable for consumption in following tasks [#518](https://github.com/microsoft/powerplatform-build-tools/pull/518) / [#522](https://github.com/microsoft/powerplatform-build-tools/pull/522)

2.0.40:
- pac CLI 1.26.5 (July Refresh), [Release Notes on nuget.org](https://www.nuget.org/packages/Microsoft.PowerApps.CLI)
- new task `Power Platform Update Org Settings` [#456](https://github.com/microsoft/powerplatform-build-tools/pull/456)
- tasks can now output PAC logs to console when pipeline is running in diagnostic mode[#447](https://github.com/microsoft/powerplatform-build-tools/pull/447)
- tasks moved from old Node 10 runner to Node 16

2.0.33:
- pac CLI 1.25.2 (June Refresh), [Release Notes on nuget.org](https://www.nuget.org/packages/Microsoft.PowerApps.CLI)

2.0.27:
- pac CLI 1.24.3 (May Refresh), [Release Notes on nuget.org](https://www.nuget.org/packages/Microsoft.PowerApps.CLI)
  - includes SolutionPackager update fixing [#274](https://github.com/microsoft/powerplatform-build-tools/issues/274)
- fixes case sensitivity in boolean arguments expecting `true` failing to accept `True`, seen in [#284](https://github.com/microsoft/powerplatform-build-tools/issues/284) and [#301](https://github.com/microsoft/powerplatform-build-tools/issues/301)

2.0.26:
- pac CLI 1.23.4 - QFE for [#327](https://github.com/microsoft/powerplatform-build-tools/issues/327)

2.0.25:
- pac CLI 1.22.3 (March Refresh), [Release Notes on nuget.org](https://www.nuget.org/packages/Microsoft.PowerApps.CLI)
  - includes SolutionPackager update to address #285

2.0.18:
- pac CLI 1.21.13

2.0.17:
- pac CLI 1.21.8 (December refresh)

2.0.15:
- pac CLI 1.21.5 to fix Managed Identities authN on linux agents

2.0.13:
- added support for authentication via Azure Managed Identities
- pac CLI 1.21.x (November refresh)

2.0.10:
- new task 'Install Applications' to install D365 apps from AppSource
- 'Deploy Package' has new optional parameter to pass in a package runtime settings json file
- pac CLI 1.20.x (October refresh)

2.0.8:
- pac CLI 1.19.x (September refresh)
- solution-unpack: updated PALT library to address NullRefException (#194)
- package deploy: by default, the import-solution and solution-delete-and-promote legs are now running asynchronously, avoiding http timeout errors
- solution export: only append "_managed" if the "Solution Output File" task input property does not specify a full path to a .zip file (#204 & #216)
- solution import: task rejects with error if deployment settings file has Dataverse Environment Variables without value (#154)

2.0.7:
- new task: 'Set Connection Variables' #151 & #182
- new tasks: 'Import Data' & 'Export Data' #188
- fixes for issues: #168, #170
- update to latest pac CLI 1.18.x

2.0.5:
- pick up hot-fixed pac CLI 1.17.6 to address #179 and #180: accessToken expires after 60 min

2.0.4:
- Pick up hot-fixed pac CLI 1.17.5 to address #171

2.0.3:
- 'Import Solution' task:
  - 'ActivatePlugins' task parameter is on by default; deprecate param 'PublishWorkflows' but consider both for plugin activation (#131)
  - fix forced 'PublishChanges' and its potential http timeout on PublishAllCustomizations (#129)
  - introduces a new "PublishCustomizationChanges" task parameter to also publish customizations after successful import
  - 'Copy Environment' task uses MinimalCopy by default

2.0.1:
- Tasks are now implemented using [PowerPlatform CLI](https://aka.ms/PowerPlatformCLI)

- To take advantage of new features and fixes, your pipelines MUST MIGRATE TO version 2 of all tasks (no mixed v0 and v2 possible)

- 'Tool Installer' task: still required as first task, but it will no longer require access to PowershellGallery, nor nuget.org feeds
- Mixing v0 and v2 PP-BT tasks is NOT supported; please consult https://aka.ms/pp-bt-migrate-to-v2 on how to migrate your existing v0 pipelines to PP-BT v2.

- Cross-platform support: Tasks can run on either Windows or Linux build agents
  (exception: 'Package Deploy' which requires Windows)
- Fix upload error for DeployPackage/Checker when running in release pipeline (#125)
- New features:
  - all environment admin tasks (like 'Create Environment') now set an explicit output variable
  - all instance tasks now have an explicit input parameter 'Environment' with a default value of '$(BuildTools.EnvironmentUrl)'
  - 'Create Environment' has a new parameter to associate new environment with Microsoft Teams ID
  - Power Pages support: Upload/Download PAPortal pages
  - 'Pack/Unpack Solution' tasks have added parameters: MapFile, localization params, DisablePluginRemap, ProcessCanvasApps
  - 'Check Solution' task supports wildcards/glob for solution.zip path to select >= 1 solutions
  - 'Deploy Package' task captures the deployment log into the job's artifact store

===========================
## Legacy v0/PowerShell implementation:

1.0.89:
>> Final release of the PowerShell implementation of PP-BT.
>> This PS implementation (i.e. all @0 versioned tasks) is now DEPRECATED and will NO LONGER receive any updates!

- Mixing v0 and v2 PP-BT tasks is NOT supported; please consult https://aka.ms/pp-bt-migrate-to-v2 on how to migrate your pipelines to PP-BT v2.

1.0.87:
- Update to newer PackageManagement 1.4.8.1
- Update to latest SolutionPackager version in ToolInstaller
- Extend Checker task's default timeout from 5 min to 50 min

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
