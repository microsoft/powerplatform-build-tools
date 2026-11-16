// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
import { should } from "chai";

should();

const audit = require("../../scripts/audit-overrides");

const lockOf = (packages: Record<string, any>) => ({
  lockfileVersion: 3,
  packages: { "": { name: "fixture", version: "1.0.0" }, ...packages },
});

describe("audit-overrides", () => {
  describe("toSemverRange", () => {
    it("accepts the comma-separated ranges the GitHub Advisory DB returns", () => {
      audit.toSemverRange(">= 1.16.0, < 1.16.1").should.equal(">= 1.16.0 < 1.16.1");
      audit.toSemverRange("< 11.0.1").should.equal("< 11.0.1");
    });
  });

  describe("findIneffectiveOverrides", () => {
    it("flags a bundled copy that an override never reached", () => {
      const problems = audit.findIneffectiveOverrides(
        { overrides: { "follow-redirects": "^1.16.2" } },
        lockOf({ "node_modules/follow-redirects": { version: "1.16.0", inBundle: true } })
      );
      problems.should.have.length(1);
      problems[0].should.include({ name: "follow-redirects", version: "1.16.0", inBundle: true });
    });

    it("passes once the lock satisfies the override", () => {
      audit.findIneffectiveOverrides(
        { overrides: { "follow-redirects": "^1.16.2" } },
        lockOf({ "node_modules/follow-redirects": { version: "1.16.2", inBundle: true } })
      ).should.be.empty;
    });

    it("applies a version-scoped parent override only to matching parents", () => {
      const lock = lockOf({
        "node_modules/minimatch": { version: "3.1.5", dependencies: { "brace-expansion": "^1.1.7" } },
        "node_modules/minimatch/node_modules/brace-expansion": { version: "1.1.21" },
        "node_modules/tool/node_modules/minimatch": { version: "10.2.4", dependencies: { "brace-expansion": "^5.0.2" } },
        "node_modules/tool/node_modules/brace-expansion": { version: "5.0.9" },
      });
      const problems = audit.findIneffectiveOverrides(
        { overrides: { "minimatch@^10": { "brace-expansion": "^5.0.12" } } },
        lock
      );
      problems.map((p: any) => p.path).should.deep.equal(["node_modules/tool/node_modules/brace-expansion"]);
    });

    it("resolves $references to the root dependency spec", () => {
      audit.findIneffectiveOverrides(
        { dependencies: { semver: "^7.7.4" }, overrides: { semver: "$semver" } },
        lockOf({ "node_modules/semver": { version: "7.6.0" } })
      ).should.have.length(1);
    });
  });

  describe("findDriftProneOverrides", () => {
    const lock = lockOf({ "node_modules/adm-zip": { version: "0.6.1", inBundle: true } });

    it("flags a bundled root dependency overridden with a range", () => {
      audit.findDriftProneOverrides(
        { devDependencies: { "adm-zip": "^0.6.1" }, overrides: { "adm-zip": "^0.6.1" } },
        lock
      ).should.deep.equal([{ name: "adm-zip", range: "^0.6.1", version: "0.6.1" }]);
    });

    it("accepts an exact pin", () => {
      audit.findDriftProneOverrides(
        { devDependencies: { "adm-zip": "0.6.1" }, overrides: { "adm-zip": "0.6.1" } },
        lock
      ).should.be.empty;
    });
  });

  describe("findForcedMajors", () => {
    it("reports only dependencies moved onto another major line", () => {
      const lock = lockOf({
        "node_modules/minimatch": { version: "5.1.9", dependencies: { "brace-expansion": "^2.0.1" } },
        "node_modules/brace-expansion": { version: "5.0.12" },
        "node_modules/a": { version: "1.0.0", dependencies: { b: "^1.2.0" } },
        "node_modules/b": { version: "1.1.0" },
        "node_modules/task-lib": { version: "5.0.0", dependencies: { "adm-zip": "^0.5.10" } },
        "node_modules/adm-zip": { version: "0.6.1" },
      });
      audit.findForcedMajors(lock).map((f: any) => f.key).should.have.members([
        "minimatch > brace-expansion",
        "task-lib > adm-zip",
      ]);
    });
  });

  describe("checkLock", () => {
    const lock = lockOf({
      "node_modules/parent": { version: "1.0.0", dependencies: { child: "^2.0.0" } },
      "node_modules/child": { version: "3.0.0" },
    });

    it("fails on an unexplained production dependency forced onto another major line", () => {
      audit.checkLock({}, lock, {}).ok.should.equal(false);
    });

    it("passes when that forced major line is explained", () => {
      audit.checkLock({}, lock, { "parent > child": "verified compatible" }).ok.should.equal(true);
    });

    it("only warns when the forced major line is dev-only", () => {
      const result = audit.checkLock(
        {},
        lockOf({
          "node_modules/parent": { version: "1.0.0", dev: true, dependencies: { child: "^2.0.0" } },
          "node_modules/child": { version: "3.0.0", dev: true },
        }),
        {}
      );
      result.ok.should.equal(true);
      result.devForced.should.have.length(1);
    });
  });

  describe("planBundledPatch", () => {
    const funding = [{ type: "individual", url: "https://github.com/sponsors/RubenVerborgh" }];
    const lock = lockOf({
      "node_modules/follow-redirects": {
        version: "1.16.0",
        resolved: "https://registry.example/follow-redirects-1.16.0.tgz",
        integrity: "sha512-old",
        funding,
        inBundle: true,
        license: "MIT",
        engines: { node: ">=4.0" },
        peerDependenciesMeta: { debug: { optional: true } },
      },
      "node_modules/debug": { version: "4.4.3" },
    });
    const manifest = {
      name: "follow-redirects",
      version: "1.16.2",
      dist: { tarball: "https://registry.example/follow-redirects-1.16.2.tgz", integrity: "sha512-new" },
      funding,
      license: "MIT",
      engines: { node: ">=4.0" },
      peerDependenciesMeta: { debug: { optional: true } },
    };

    it("rebuilds the entry the way npm writes it and keeps the bundle flag", () => {
      const plan = audit.planBundledPatch(lock, "node_modules/follow-redirects", manifest);
      plan.ok.should.equal(true);
      JSON.stringify(plan.entry).should.equal(JSON.stringify({
        version: "1.16.2",
        resolved: "https://registry.example/follow-redirects-1.16.2.tgz",
        integrity: "sha512-new",
        funding,
        inBundle: true,
        license: "MIT",
        engines: { node: ">=4.0" },
        peerDependenciesMeta: { debug: { optional: true } },
      }));
    });

    it("refuses when the new version needs a dependency the tree does not satisfy", () => {
      const plan = audit.planBundledPatch(lock, "node_modules/follow-redirects", {
        ...manifest,
        dependencies: { debug: "^5.0.0" },
      });
      plan.ok.should.equal(false);
      plan.reason.should.contain("debug@^5.0.0");
    });

    it("refuses registry metadata without a sha512 integrity", () => {
      audit.planBundledPatch(lock, "node_modules/follow-redirects", { ...manifest, dist: { tarball: "x" } })
        .ok.should.equal(false);
    });
  });

  describe("repository lock file", () => {
    it("passes the same check CI runs", () => {
      const result = audit.checkLock(require("../../package.json"), require("../../package-lock.json"));
      result.ok.should.equal(true, audit.formatCheck(result));
    });
  });
});
