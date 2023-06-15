// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import gulp from "gulp";
import unitTest from "./unitTest.mjs";
import componentTest from "./componentTest.mjs";
import functionalTest from "./functionalTest.mjs";

const all = gulp.series(unitTest, functionalTest);

export {
    all,
    unitTest,
    componentTest,
    functionalTest,
}
