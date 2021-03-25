// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { expect } from "chai";
import { World } from "../src";

describe("World", () => {
  const world = new World();

  it("Hello", () => {
    expect(world).to.be.not.undefined;
    world.Hello();
  });
});
