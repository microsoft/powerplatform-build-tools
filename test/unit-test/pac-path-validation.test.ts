// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { assert, should, use } from "chai";
import * as sinonChai from "sinon-chai";
import { validatePacPath, PacPathEnvVarName } from "../../src/host/BuildToolsRunnerParams";

should();
use(sinonChai);

describe("PAC CLI path validation", () => {

  describe("validatePacPath - valid paths", () => {
    it("accepts Linux LIVE task path", () => {
      const validPath = "/home/vsts/work/_tasks/PowerPlatformToolInstaller_8015465b-f367-4ec4-8215-8edf682574d3/2.0.137/bin";
      assert.doesNotThrow(() => validatePacPath(validPath));
    });

    it("accepts Windows LIVE task path", () => {
      const validPath = "C:\\agent\\_work\\_tasks\\PowerPlatformToolInstaller_8015465b-f367-4ec4-8215-8edf682574d3\\2.0.137\\bin";
      assert.doesNotThrow(() => validatePacPath(validPath));
    });

    it("accepts BETA task GUID path", () => {
      const validPath = "/home/vsts/work/_tasks/PowerPlatformToolInstaller_a4243e47-8809-429e-bda4-624757b874b5/2.0.137/bin";
      assert.doesNotThrow(() => validatePacPath(validPath));
    });

    it("accepts DEV task GUID path", () => {
      const validPath = "/home/vsts/work/_tasks/PowerPlatformToolInstaller_bbb104f9-1acc-4584-8b09-93b8e2373659/2.0.137/bin";
      assert.doesNotThrow(() => validatePacPath(validPath));
    });

    it("accepts EXPERIMENTAL task GUID path", () => {
      const validPath = "/home/vsts/work/_tasks/PowerPlatformToolInstaller_133b55b8-c51f-4ceb-8270-6d68c0cac6e4/2.0.137/bin";
      assert.doesNotThrow(() => validatePacPath(validPath));
    });

    it("accepts path with mixed case in ToolInstaller directory name", () => {
      const validPath = "/home/vsts/work/_tasks/powerplatformtoolinstaller_8015465b-f367-4ec4-8215-8edf682574d3/2.0.137/bin";
      assert.doesNotThrow(() => validatePacPath(validPath));
    });
  });

  describe("validatePacPath - rejects attacker paths", () => {
    it("rejects /tmp path (attacker-controlled)", () => {
      const attackerPath = "/tmp/ppbt-pac-root";
      assert.throws(() => validatePacPath(attackerPath), /Security validation failed.*not under the agent's _tasks directory/);
    });

    it("rejects source directory path", () => {
      const attackerPath = "/home/vsts/work/1/s/fake-pac";
      assert.throws(() => validatePacPath(attackerPath), /Security validation failed.*not under the agent's _tasks directory/);
    });

    it("rejects pipeline workspace path", () => {
      const attackerPath = "/home/vsts/work/1/a/malicious-pac";
      assert.throws(() => validatePacPath(attackerPath), /Security validation failed.*not under the agent's _tasks directory/);
    });

    it("rejects path under _tasks but with wrong task GUID", () => {
      const attackerPath = "/home/vsts/work/_tasks/SomeOtherTask_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/1.0.0/bin";
      assert.throws(() => validatePacPath(attackerPath), /Security validation failed.*does not reference a known/);
    });

    it("rejects path that contains _tasks as a substring but not as a directory", () => {
      const attackerPath = "/tmp/fake_tasks_dir/pac";
      assert.throws(() => validatePacPath(attackerPath), /Security validation failed/);
    });

    it("rejects Windows temp path", () => {
      const attackerPath = "C:\\Users\\vsts\\AppData\\Local\\Temp\\ppbt-pac-root";
      assert.throws(() => validatePacPath(attackerPath), /Security validation failed.*not under the agent's _tasks directory/);
    });

    it("rejects path with _tasks but fabricated GUID mimicking installer", () => {
      const attackerPath = "/home/vsts/work/_tasks/PowerPlatformToolInstaller_00000000-0000-0000-0000-000000000000/1.0.0/bin";
      assert.throws(() => validatePacPath(attackerPath), /Security validation failed.*does not reference a known/);
    });
  });
});
