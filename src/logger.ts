// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
export interface Logger {
    info(...args: string[]): void;
    warn(...args: string[]): void;
    error(...args: string[]): void;
}
