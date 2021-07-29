// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { BuildToolsHost } from "./BuildToolsHost";
import { InputValidator } from "@microsoft/powerplatform-cli-wrapper/dist/host";

export const host = new BuildToolsHost();
export const validator = new InputValidator(host);
