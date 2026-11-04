export const COUNTRIES = ["Nigeria", "Ghana", "Cameroon", "Benin", "Togo", "Niger", "Chad", "Côte d'Ivoire", "Senegal", "South Africa", "Kenya", "United Kingdom", "United States", "Canada", "Other"];

export const NG_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

export const LAGOS_PREMIUM = ["Lekki", "Lekki Phase 1", "Ajah", "Victoria Island", "Ikoyi"];
export const LAGOS_AREAS = [...LAGOS_PREMIUM, "Ikeja", "Surulere", "Yaba", "Ikorodu", "Alaba", "Oshodi", "Agege", "Others"];

// Abuja, Port Harcourt (Rivers), Ibadan (Oyo), Kano, Enugu, Ogun, Oyo
const MAJOR_STATES = ["FCT (Abuja)", "Rivers", "Oyo", "Kano", "Enugu", "Ogun"];

export function deliveryFee(country: string, state: string, region: string): number {
  if (country.trim().toLowerCase() !== "nigeria") return 15000;
  if (state === "Lagos") {
    const r = region.trim().toLowerCase();
    return LAGOS_PREMIUM.some((p) => p.toLowerCase() === r) ? 2500 : 2000;
  }
  if (MAJOR_STATES.includes(state)) return 4500;
  return 5500;
}

// Payment details shown to customers.
export const BANK = { name: "OPay", accountName: "Chukwuemeka Columbus", accountNumber: "8089778840" };
