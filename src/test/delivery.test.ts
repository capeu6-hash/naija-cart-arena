import { describe, it, expect } from "vitest";
import { deliveryFee } from "@/lib/delivery";

describe("deliveryFee", () => {
  it("Lagos Lekki is 2500", () => expect(deliveryFee("Nigeria", "Lagos", "Lekki")).toBe(2500));
  it("Lagos Ikoyi is 2500", () => expect(deliveryFee("Nigeria", "Lagos", "Ikoyi")).toBe(2500));
  it("Lagos Ikeja is 2000", () => expect(deliveryFee("Nigeria", "Lagos", "Ikeja")).toBe(2000));
  it("Lagos other area is 2000", () => expect(deliveryFee("Nigeria", "Lagos", "Others")).toBe(2000));
  it("Abuja is 4500", () => expect(deliveryFee("Nigeria", "FCT (Abuja)", "Wuse")).toBe(4500));
  it("Rivers (Port Harcourt) is 4500", () => expect(deliveryFee("Nigeria", "Rivers", "")).toBe(4500));
  it("Ogun is 4500", () => expect(deliveryFee("Nigeria", "Ogun", "")).toBe(4500));
  it("other state is 5500", () => expect(deliveryFee("Nigeria", "Borno", "")).toBe(5500));
  it("outside Nigeria is 15000", () => expect(deliveryFee("Ghana", "Accra", "")).toBe(15000));
});
