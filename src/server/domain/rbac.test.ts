import { describe, expect, it } from "vitest";

import { canDeleteWorkspace, canManageBilling, canManageMembers, roleAtLeast } from "./rbac";

describe("rbac", () => {
  it("orders roles MEMBER < ADMIN < OWNER", () => {
    expect(roleAtLeast("MEMBER", "ADMIN")).toBe(false);
    expect(roleAtLeast("ADMIN", "MEMBER")).toBe(true);
    expect(roleAtLeast("OWNER", "ADMIN")).toBe(true);
    expect(roleAtLeast("OWNER", "OWNER")).toBe(true);
  });

  it("only admins and owners manage members", () => {
    expect(canManageMembers("MEMBER")).toBe(false);
    expect(canManageMembers("ADMIN")).toBe(true);
    expect(canManageMembers("OWNER")).toBe(true);
  });

  it("only owners manage billing and delete the workspace", () => {
    expect(canManageBilling("ADMIN")).toBe(false);
    expect(canManageBilling("OWNER")).toBe(true);
    expect(canDeleteWorkspace("ADMIN")).toBe(false);
    expect(canDeleteWorkspace("OWNER")).toBe(true);
  });
});
