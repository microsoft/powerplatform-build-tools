// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { assert } from "chai";
import fs = require("fs");
import os = require("os");
import path = require("path");
import { createSandbox } from "sinon";
import rewiremock from "../rewiremock";

type RunnerModule = typeof import("../../src/host/BuildToolsRunnerParams");
interface Installation {
  task: string;
  version: string;
  bin: string;
  platform: string;
  tools: string;
  executable: string;
}

const channels = [
  { name: "LIVE", guid: "8015465b-f367-4ec4-8215-8edf682574d3" },
  { name: "BETA", guid: "a4243e47-8809-429e-bda4-624757b874b5" },
  { name: "DEV", guid: "bbb104f9-1acc-4584-8b09-93b8e2373659" },
  { name: "EXPERIMENTAL", guid: "133b55b8-c51f-4ceb-8270-6d68c0cac6e4" }
];
const installerName = `PowerPlatformToolInstaller_${channels[0].guid}`;
const consumerName = "ConsumerTask_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const windows = process.platform === "win32";
const nativeSuite = windows || process.platform === "linux" ? describe : describe.skip;

// Suppress task-lib initialization, not validation: these fixtures never inspect agent
// credentials, publish telemetry, construct a CLI wrapper, or execute the inert files.
async function loadRunnerModule(getVariable: () => never): Promise<RunnerModule> {
  return rewiremock.around(
    () => import("../../src/host/BuildToolsRunnerParams"),
    mock => mock(() => import("azure-pipelines-task-lib/task")).with({ getVariable })
  );
}

nativeSuite(`PAC CLI path validation (native ${process.platform})`, () => {
  const sandbox = createSandbox();
  let runnerModule: RunnerModule;
  let tempRoot: string;
  let cacheRoot: string;
  let trustedModuleDir: string;

  before(async () => {
    runnerModule = await loadRunnerModule(() => {
      throw new Error("Pure path validation must not read pipeline variables");
    });
  });

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ppbt-pac-validation-"));
    cacheRoot = path.join(tempRoot, "agent", "_tasks");
    trustedModuleDir = path.join(cacheRoot, consumerName, "2.0.155");
    fs.mkdirSync(trustedModuleDir, { recursive: true });
  });

  afterEach(() => {
    try {
      sandbox.restore();
    } finally {
      if (tempRoot) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    }
  });

  function populateBin(bin: string): Installation {
    const platform = path.join(bin, windows ? "pac" : "pac_linux");
    const tools = path.join(platform, "tools");
    const executable = path.join(tools, windows ? "pac.exe" : "pac");
    fs.mkdirSync(tools, { recursive: true });
    fs.writeFileSync(executable, "Inert PAC path-validation fixture; never execute.\n", { flag: "wx" });
    if (process.platform === "linux") {
      fs.chmodSync(executable, 0o755);
    }
    return { task: path.dirname(path.dirname(bin)), version: path.dirname(bin), bin, platform, tools, executable };
  }

  function install(root = cacheRoot, task = installerName, version = "2.0.137"): Installation {
    return populateBin(path.join(root, task, version, "bin"));
  }

  function validate(candidate: string, moduleDir = trustedModuleDir): string {
    return runnerModule.validatePacPath(candidate, moduleDir);
  }

  function rejects(candidate: string, reason: RegExp, moduleDir = trustedModuleDir): void {
    const error = assert.throws(() => validate(candidate, moduleDir), reason);
    assert.match(error.message, /^Security validation failed:/);
    assert.include(error.message, "PowerPlatformToolInstaller@2");
    assert.include(error.message, runnerModule.PacPathEnvVarName);
    assert.notProperty(error, "code", "policy rejection must not be an incidental filesystem error");
  }

  function rejectsWithCode(candidate: string, code: string): void {
    assert.propertyVal(assert.throws(() => validate(candidate)), "code", code);
  }

  function directoryLink(target: string, link: string): void {
    // Junctions exercise native Windows redirection without requiring symlink privilege.
    fs.symlinkSync(target, link, windows ? "junction" : "dir");
  }

  function skipWithReason(context: Mocha.Context, reason: string): never {
    if (context.test) {
      context.test.title += ` [skipped: ${reason}]`;
    }
    return context.skip();
  }

  function executableLink(context: Mocha.Context, target: string, link: string): void {
    try {
      fs.symlinkSync(target, link, "file");
    } catch (error: unknown) {
      if (windows && error instanceof Error &&
          "code" in error && error.code === "EPERM" &&
          "syscall" in error && error.syscall === "symlink") {
        skipWithReason(context, "Windows file-symlink privilege unavailable (EPERM)");
      }
      throw error;
    }
  }

  function sameNativeDirectory(first: string, second: string): boolean {
    const a = fs.statSync(first, { bigint: true });
    const b = fs.statSync(second, { bigint: true });
    return a.isDirectory() && b.isDirectory() && a.ino !== BigInt(0) &&
      a.dev === b.dev && a.ino === b.ino;
  }

  it("imports before PAC discovery without resolving validation paths", async () => {
    const discovery = sandbox.stub<[], never>().throws(new Error("Unexpected pipeline-variable read"));
    const canonicalize = sandbox.spy(fs.realpathSync, "native");
    const imported = await loadRunnerModule(discovery);
    assert.isFunction(imported.validatePacPath);
    assert.isFalse(discovery.called);
    assert.isFalse(canonicalize.called);
  });

  describe("legitimate installations", () => {
    for (const channel of channels) {
      for (const version of ["2.0.137", "2.12.456"]) {
        it(`accepts ${channel.name} ${version} with consumer 2.0.155 and returns canonical bin`, () => {
          const fixture = install(cacheRoot, `PowerPlatformToolInstaller_${channel.guid}`, version);
          assert.strictEqual(validate(fixture.bin), fs.realpathSync.native(fixture.bin));
        });
      }
    }

    it("accepts a configured cache location without relying on an _tasks name", () => {
      const configuredRoot = path.join(tempRoot, "configured-task-cache");
      const moduleDir = path.join(configuredRoot, consumerName, "2.0.155");
      fs.mkdirSync(moduleDir, { recursive: true });
      const fixture = install(configuredRoot);
      assert.strictEqual(validate(fixture.bin, moduleDir), fs.realpathSync.native(fixture.bin));
    });

    for (const aliased of ["candidate", "consumer", "both"]) {
      it(`accepts a trusted root alias for ${aliased} and returns the real bin`, () => {
        const fixture = install();
        const alias = path.join(tempRoot, "cache-alias");
        directoryLink(cacheRoot, alias);
        const candidate = aliased === "consumer" ? fixture.bin :
          path.join(alias, path.relative(cacheRoot, fixture.bin));
        const moduleDir = aliased === "candidate" ? trustedModuleDir :
          path.join(alias, path.relative(cacheRoot, trustedModuleDir));
        assert.strictEqual(validate(candidate, moduleDir), fs.realpathSync.native(fixture.bin));
      });
    }

    for (const entry of ["bin", "platform", "tools"] as const) {
      it(`allows a contained ${entry} directory link within the selected installation`, () => {
        const fixture = install();
        const target = path.join(fixture.version, `contained-${entry}`);
        fs.renameSync(fixture[entry], target);
        directoryLink(target, fixture[entry]);
        const canonicalBin = fs.realpathSync.native(fixture.bin);
        assert.strictEqual(validate(fixture.bin), canonicalBin);
        if (entry === "bin") {
          assert.notStrictEqual(canonicalBin, fixture.bin);
        }
      });
    }

    it("allows an executable symlink contained within the selected installation", function () {
      const fixture = install();
      const target = path.join(fixture.version, "contained-pac");
      fs.renameSync(fixture.executable, target);
      executableLink(this, target, fixture.executable);
      assert.strictEqual(validate(fixture.bin), fs.realpathSync.native(fixture.bin));
    });
  });

  describe("authority and exact layout", () => {
    for (const root of [
      ["repository", "_tasks"],
      ["other-agent", "_tasks"],
      ["agent", "_tasks-sibling"],
      ["agent", "_tasks", "extra", "_tasks"]
    ]) {
      it(`rejects a fully existing imitation under ${root.join("/")} for wrong authority`, () => {
        const fixture = install(path.join(tempRoot, ...root));
        assert.isTrue(fs.statSync(fixture.executable).isFile());
        rejects(fixture.bin, /outside the executing bundle's task cache/);
      });
    }

    it("rejects the reporter's repository imitation without a version/bin suffix", () => {
      const imitation = path.join(tempRoot, "repository", "_tasks", installerName);
      populateBin(imitation);
      rejects(imitation, /expected a known PowerPlatformToolInstaller_GUID\/2.minor.patch\/bin path/);
    });

    const malformedLayouts = [
      { name: "GUID suffix", parts: [`${installerName}_suffix`, "2.0.137", "bin"] },
      { name: "unknown GUID", parts: ["PowerPlatformToolInstaller_00000000-0000-0000-0000-000000000000", "2.0.137", "bin"] },
      { name: "wrong task name", parts: [`OtherTask_${channels[0].guid}`, "2.0.137", "bin"] },
      { name: "task/cache markers in reversed order", parts: [installerName, "_tasks", "2.0.137", "bin"] },
      { name: "extra directory before version", parts: [installerName, "extra", "2.0.137", "bin"] },
      { name: "extra directory before bin", parts: [installerName, "2.0.137", "extra", "bin"] },
      { name: "extra directory after bin", parts: [installerName, "2.0.137", "bin", "extra"] },
      { name: "missing version", parts: [installerName, "bin"] },
      { name: "v1 version", parts: [installerName, "1.0.137", "bin"] },
      { name: "v3 version", parts: [installerName, "3.0.137", "bin"] },
      { name: "short version", parts: [installerName, "2.137", "bin"] },
      { name: "empty version component", parts: [installerName, "2..137", "bin"] },
      { name: "version suffix", parts: [installerName, "2.0.137-beta", "bin"] },
      { name: "extra version component", parts: [installerName, "2.0.137.1", "bin"] },
      { name: "bin suffix", parts: [installerName, "2.0.137", "bin-extra"] }
    ];
    for (const scenario of malformedLayouts) {
      it(`rejects ${scenario.name} even when the candidate and executable exist`, () => {
        const fixture = populateBin(path.join(cacheRoot, ...scenario.parts));
        assert.isTrue(fs.statSync(fixture.executable).isFile());
        rejects(fixture.bin, /expected a known PowerPlatformToolInstaller_GUID\/2.minor.patch\/bin path/);
      });
    }

    it("ignores unrelated CWD and spoofed agent/PAC variables when choosing the supplied trusted root", () => {
      const legitimate = install();
      const forged = install(path.join(tempRoot, "repository", "_tasks"));
      const environmentNames = [
        "AGENT_WORKFOLDER", "AGENT_HOMEDIRECTORY", "AGENT_BUILDDIRECTORY",
        "BUILD_SOURCESDIRECTORY", "SYSTEM_DEFAULTWORKINGDIRECTORY", runnerModule.PacPathEnvVarName
      ];
      const saved = environmentNames.map(name => ({ name, value: process.env[name] }));
      const originalCwd = process.cwd();
      try {
        for (const name of environmentNames) {
          process.env[name] = name === runnerModule.PacPathEnvVarName ? forged.bin : path.dirname(path.dirname(forged.task));
        }
        process.chdir(path.join(tempRoot, "repository"));
        assert.strictEqual(validate(legitimate.bin), fs.realpathSync.native(legitimate.bin));
        rejects(forged.bin, /outside the executing bundle's task cache/);
      } finally {
        try {
          process.chdir(originalCwd);
        } finally {
          for (const { name, value } of saved) {
            if (value === undefined) {
              delete process.env[name];
            } else {
              process.env[name] = value;
            }
          }
        }
      }
    });
  });

  describe("lexical inputs and trusted module layout", () => {
    const invalidInputs: { name: string; change: (absolute: string) => string }[] = [
      { name: "empty argument", change: () => "" },
      { name: "relative argument", change: absolute => path.relative(tempRoot, absolute) },
      { name: "dot traversal", change: absolute => `${path.dirname(absolute)}${path.sep}.${path.sep}${path.basename(absolute)}` },
      { name: "parent traversal", change: absolute => `${path.dirname(absolute)}${path.sep}child${path.sep}..${path.sep}${path.basename(absolute)}` },
      { name: "NUL argument", change: absolute => `${absolute}\0` }
    ];
    for (const input of invalidInputs) {
      for (const argument of ["PAC path", "trusted module"]) {
        it(`rejects ${input.name} in ${argument} with setup guidance`, () => {
          const fixture = install();
          const candidate = argument === "PAC path" ? input.change(fixture.bin) : fixture.bin;
          const moduleDir = argument === "trusted module" ? input.change(trustedModuleDir) : trustedModuleDir;
          rejects(candidate, /paths must be fully qualified platform paths without traversal or device namespaces/, moduleDir);
        });
      }
    }

    for (const parts of [
      ["ConsumerTask", "2.0.155"],
      [`${consumerName}_suffix`, "2.0.155"],
      [consumerName, "1.0.155"],
      [consumerName, "2.0.155-beta"],
      [consumerName, "2.0.155", "extra"]
    ]) {
      it(`rejects an existing malformed trusted module layout: ${parts.join("/")}`, () => {
        const fixture = install();
        const moduleDir = path.join(cacheRoot, ...parts);
        fs.mkdirSync(moduleDir, { recursive: true });
        rejects(fixture.bin, /executing bundle is not in a taskName_GUID\/v2-version directory/, moduleDir);
      });
    }
  });

  describe("filesystem failures", () => {
    for (const entry of ["task", "version", "bin", "platform", "tools", "executable"] as const) {
      it(`propagates ENOENT for missing ${entry}`, () => {
        const fixture = install();
        fs.rmSync(fixture[entry], { recursive: true });
        rejectsWithCode(fixture.bin, "ENOENT");
      });
    }

    for (const entry of ["bin", "platform", "tools"] as const) {
      it(`rejects a file in place of the ${entry} directory`, () => {
        const fixture = install();
        fs.rmSync(fixture[entry], { recursive: true });
        fs.writeFileSync(fixture[entry], "Not a directory");
        rejects(fixture.bin, /required task-cache or PAC directory is not a directory/);
      });
    }

    it("rejects an executable that is a directory", () => {
      const fixture = install();
      fs.unlinkSync(fixture.executable);
      fs.mkdirSync(fixture.executable);
      rejects(fixture.bin, /PAC executable is not a regular file/);
    });

    for (const call of [0, 1]) {
      it(`fails closed when root identity ${call + 1} has a zero inode`, () => {
        const fixture = install();
        const canonicalRoot = fs.realpathSync.native(cacheRoot);
        const unavailable = fs.statSync(canonicalRoot, { bigint: true });
        unavailable.ino = BigInt(0);
        const stat = sandbox.stub(fs, "statSync").callThrough();
        stat.withArgs(canonicalRoot, { bigint: true }).onCall(call).returns(unavailable);
        rejects(fixture.bin, /filesystem does not expose a usable directory identity/);
      });
    }

    it("propagates an identity stat failure unchanged", () => {
      const fixture = install();
      const canonicalRoot = fs.realpathSync.native(cacheRoot);
      const failure = Object.assign(new Error("Fixture directory identity access denied"), { code: "EACCES" });
      sandbox.stub(fs, "statSync").callThrough()
        .withArgs(canonicalRoot, { bigint: true }).throws(failure);
      assert.strictEqual(assert.throws(() => validate(fixture.bin)), failure);
    });

    it("propagates a canonicalization failure unchanged", () => {
      const fixture = install();
      const canonicalVersion = fs.realpathSync.native(fixture.version);
      const failure = Object.assign(new Error("Fixture bin access denied"), { code: "EACCES" });
      sandbox.stub(fs.realpathSync, "native").callThrough()
        .withArgs(path.join(canonicalVersion, "bin")).throws(failure);
      assert.strictEqual(assert.throws(() => validate(fixture.bin)), failure);
    });
  });

  describe("installation links and descendant escapes", () => {
    for (const entry of ["task", "version"] as const) {
      for (const location of ["outside cache", "inside cache"]) {
        it(`rejects a linked ${entry} even with a real target ${location}`, () => {
          const fixture = install();
          const target = location === "outside cache" ? install(path.join(tempRoot, "foreign", "_tasks")) :
            entry === "task" ? install(cacheRoot, `OtherTask_${channels[1].guid}`) :
              install(cacheRoot, installerName, "2.0.136");
          fs.rmSync(fixture[entry], { recursive: true });
          directoryLink(target[entry], fixture[entry]);
          rejects(fixture.bin, /installer task and version entries must be directories, not links/);
        });
      }
    }

    for (const entry of ["bin", "platform", "tools", "executable"] as const) {
      for (const location of ["outside cache", "another cached task", "another version"]) {
        it(`rejects ${entry} redirection to ${location}`, function () {
          const fixture = install();
          const target = location === "outside cache" ? install(path.join(tempRoot, "foreign", "_tasks")) :
            location === "another cached task" ? install(cacheRoot, `PowerPlatformToolInstaller_${channels[1].guid}`) :
              install(cacheRoot, installerName, "2.0.136");
          fs.rmSync(fixture[entry], { recursive: true });
          if (entry === "executable") {
            executableLink(this, target.executable, fixture.executable);
          } else {
            directoryLink(target[entry], fixture[entry]);
          }
          rejects(fixture.bin, /PAC path redirects outside the selected installer version/);
        });
      }

      it(`propagates ENOENT for a dangling ${entry} link`, function () {
        const fixture = install();
        const missing = path.join(tempRoot, `missing-${entry}`);
        fs.rmSync(fixture[entry], { recursive: true });
        if (entry === "executable") {
          executableLink(this, missing, fixture.executable);
        } else {
          directoryLink(missing, fixture[entry]);
        }
        rejectsWithCode(fixture.bin, "ENOENT");
      });
    }
  });

  it("rejects distinct case-sensitive cache siblings (native or labeled identity fallback)", function () {
    const sibling = path.join(path.dirname(cacheRoot), "_TASKS");
    const fixture = install(sibling);
    if (sameNativeDirectory(cacheRoot, sibling)) {
      // Without a case-sensitive native directory, model only the two canonical
      // root identities. All installation paths and PAC contents remain real.
      if (this.test) {
        this.test.title += " [simulated root identities: native filesystem is case-insensitive]";
      }
      const first = fs.statSync(cacheRoot, { bigint: true });
      const second = fs.statSync(sibling, { bigint: true });
      first.ino = BigInt("9007199254740992");
      second.ino = first.ino + BigInt(1);
      const canonicalize = sandbox.stub(fs.realpathSync, "native").callThrough();
      canonicalize.withArgs(cacheRoot).returns(cacheRoot);
      canonicalize.withArgs(sibling).returns(sibling);
      const stat = sandbox.stub(fs, "statSync").callThrough();
      stat.withArgs(cacheRoot, { bigint: true }).returns(first);
      stat.withArgs(sibling, { bigint: true }).returns(second);
    }
    rejects(fixture.bin, /outside the executing bundle's task cache/);
  });

  (process.platform === "linux" ? describe : describe.skip)("Linux exact-case and executable permissions", () => {
    for (const entry of ["task", "bin", "platform", "tools", "executable"] as const) {
      it(`does not case-fold the ${entry} component`, () => {
        const fixture = install();
        const changed = path.join(path.dirname(fixture[entry]), path.basename(fixture[entry]).toUpperCase());
        fs.renameSync(fixture[entry], changed);
        if (entry === "task") {
          rejects(path.join(changed, "2.0.137", "bin"), /expected a known PowerPlatformToolInstaller_GUID/);
        } else if (entry === "bin") {
          rejects(changed, /expected a known PowerPlatformToolInstaller_GUID/);
        } else {
          rejectsWithCode(fixture.bin, "ENOENT");
        }
      });
    }

    it("propagates EACCES when the regular PAC file lacks X_OK", () => {
      const fixture = install();
      fs.chmodSync(fixture.executable, 0o644);
      rejectsWithCode(fixture.bin, "EACCES");
    });
  });

  (windows ? describe : describe.skip)("Windows native aliases and lexical restrictions", () => {
    const aliases: { name: string; change: (fixture: Installation) => string }[] = [
      { name: "installer case", change: fixture => path.join(cacheRoot, installerName.toLowerCase(), path.basename(fixture.version), "bin") },
      { name: "bin case", change: fixture => path.join(fixture.version, "BIN") },
      {
        name: "drive case",
        change: fixture => fixture.bin.replace(/^[a-z](?=:)/i,
          drive => drive === drive.toUpperCase() ? drive.toLowerCase() : drive.toUpperCase())
      }
    ];
    for (const alias of aliases) {
      it(`accepts ${alias.name} only when it resolves to the same native object`, function () {
        const fixture = install();
        const candidate = alias.change(fixture);
        if (candidate === fixture.bin) {
          skipWithReason(this, "native path has no drive-letter case alias");
        }
        if (!fs.existsSync(candidate) || !sameNativeDirectory(fixture.bin, candidate)) {
          skipWithReason(this, "case alias does not identify the same native directory");
        }
        assert.strictEqual(validate(candidate), fs.realpathSync.native(fixture.bin));
      });
    }

    const invalidWindowsPaths: { name: string; change: (absolute: string) => string }[] = [
      { name: "root-relative", change: absolute => `\\${absolute.slice(path.parse(absolute).root.length)}` },
      { name: "drive-relative", change: absolute => `${path.parse(absolute).root.slice(0, 2)}${absolute.slice(path.parse(absolute).root.length)}` },
      { name: "extended device namespace", change: absolute => `\\\\?\\${absolute}` },
      { name: "device namespace", change: absolute => `\\\\.\\${absolute}` },
      { name: "trailing dot", change: absolute => `${absolute}.` },
      { name: "trailing space", change: absolute => `${absolute} ` },
      { name: "intermediate trailing dot", change: absolute => `${path.dirname(absolute)}.\\${path.basename(absolute)}` },
      { name: "intermediate trailing space", change: absolute => `${path.dirname(absolute)} \\${path.basename(absolute)}` }
    ];
    for (const input of invalidWindowsPaths) {
      for (const argument of ["PAC path", "trusted module"]) {
        it(`rejects ${input.name} in ${argument} before filesystem normalization`, () => {
          const fixture = install();
          const candidate = argument === "PAC path" ? input.change(fixture.bin) : fixture.bin;
          const moduleDir = argument === "trusted module" ? input.change(trustedModuleDir) : trustedModuleDir;
          rejects(candidate, /paths must be fully qualified platform paths without traversal or device namespaces/, moduleDir);
        });
      }
    }
  });
});
