import { describe, expect, it, vi } from "vitest";

import {
  isMissingStripeCustomerError,
  readUsableStripeCustomerId,
  resolveOrCreateStripeCustomerId,
} from "./stripe";

describe("isMissingStripeCustomerError", () => {
  it("matches Stripe resource_missing customer errors", () => {
    expect(
      isMissingStripeCustomerError({
        code: "resource_missing",
        message: "No such customer: 'cus_V6xFr2XUkASIqp'",
      }),
    ).toBe(true);
  });

  it("rejects missing prices and other errors", () => {
    expect(
      isMissingStripeCustomerError({
        code: "resource_missing",
        message: "No such price: 'price_123'",
      }),
    ).toBe(false);
    expect(isMissingStripeCustomerError(new Error("network"))).toBe(false);
  });
});

describe("readUsableStripeCustomerId", () => {
  it("returns null when nothing is stored", async () => {
    const retrieve = vi.fn();
    await expect(readUsableStripeCustomerId(null, retrieve)).resolves.toBe(
      null,
    );
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("returns the stored id when Stripe still has the customer", async () => {
    await expect(
      readUsableStripeCustomerId("cus_live", async () => ({ id: "cus_live" })),
    ).resolves.toBe("cus_live");
  });

  it("returns null for deleted or unknown customers", async () => {
    await expect(
      readUsableStripeCustomerId("cus_gone", async () => ({
        id: "cus_gone",
        deleted: true,
      })),
    ).resolves.toBe(null);

    await expect(
      readUsableStripeCustomerId("cus_missing", async () => {
        throw {
          code: "resource_missing",
          message: "No such customer: 'cus_missing'",
        };
      }),
    ).resolves.toBe(null);
  });

  it("rethrows unexpected Stripe failures", async () => {
    await expect(
      readUsableStripeCustomerId("cus_x", async () => {
        throw new Error("stripe_down");
      }),
    ).rejects.toThrow("stripe_down");
  });
});

describe("resolveOrCreateStripeCustomerId", () => {
  it("reuses a valid stored customer", async () => {
    const create = vi.fn();
    await expect(
      resolveOrCreateStripeCustomerId({
        storedId: "cus_ok",
        retrieve: async () => ({ id: "cus_ok" }),
        create,
      }),
    ).resolves.toEqual({ id: "cus_ok", created: false });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a replacement when the stored customer is gone", async () => {
    await expect(
      resolveOrCreateStripeCustomerId({
        storedId: "cus_stale",
        retrieve: async () => {
          throw {
            code: "resource_missing",
            message: "No such customer: 'cus_stale'",
          };
        },
        create: async () => ({ id: "cus_new" }),
      }),
    ).resolves.toEqual({ id: "cus_new", created: true });
  });
});
