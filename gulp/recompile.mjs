// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import gulp from "gulp";
import { clean } from "./clean.mjs";
import compile from "./compile.mjs";

export default gulp.series(clean, compile);
