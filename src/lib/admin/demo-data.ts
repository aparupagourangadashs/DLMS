/**
 * Deterministic demo data for customer screen reviews.
 * Everything here is synthetic and will be replaced by database queries.
 */

export const DEMO_TODAY = "2026-10-26";

export function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function helpers(seed: number) {
  const rand = createRng(seed);
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
  return { rand, int, pick };
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function at(isoDate: string, time: string) {
  return `${isoDate}T${time}`;
}

export const courses = [
  "Bhagavad Gita – Foundation Course",
  "Srimad Bhagavatam – Canto 1",
  "Bhakti Shastri",
  "Sanskrit for Beginners",
  "Vedic Parenting",
  "Kids Gita Club",
  "Ancient Wisdom for Modern Life",
  "Bhakti Vaibhava – Level 1",
  "Isopanishad Study",
  "Nectar of Devotion",
] as const;

export const instructors = [
  "Radhika Sharma",
  "Govind Iyer",
  "Madhav Kulkarni",
  "Sita Raman",
  "Keshav Menon",
  "Lalita Deshpande",
  "Ananta Rao",
] as const;

const firstNames = [
  "Aarav", "Ananya", "Vivaan", "Diya", "Arjun", "Ishita", "Krishna", "Meera", "Rohan", "Kavya",
  "Aditya", "Priya", "Siddharth", "Nandini", "Rahul", "Pooja", "Vikram", "Lakshmi", "Harsh", "Gauri",
  "Yash", "Tulsi", "Om", "Radha", "Neel", "Shreya", "Dev", "Bhavna", "Kunal", "Revati",
] as const;

const lastNames = [
  "Patel", "Sharma", "Iyer", "Nair", "Gupta", "Reddy", "Joshi", "Mehta", "Das", "Kulkarni",
  "Chopra", "Banerjee", "Pillai", "Verma", "Bhat", "Mishra",
] as const;

export const cities = ["Mumbai", "Pune", "Bengaluru", "Chennai", "Delhi", "Kolkata", "Ahmedabad", "Hyderabad", "Vrindavan", "Mayapur"] as const;

export type DemoPerson = { name: string; email: string; phone: string; city: string };

export function people(count: number, seed: number): DemoPerson[] {
  const { int, pick } = helpers(seed);
  return Array.from({ length: count }, (_, i) => {
    const first = pick(firstNames);
    const last = pick(lastNames);
    return {
      name: `${first} ${last}`,
      email: `${first}.${last}${i + 1}@example.com`.toLowerCase(),
      phone: `+91 9${int(100000000, 999999999)}`,
      city: pick(cities),
    };
  });
}

export function batchName(course: string, n: number) {
  const short = course
    .split(/[\s–-]+/)
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .join("");
  return `${short}-2026-B${n}`;
}

export const batches = courses.flatMap((course, i) =>
  [1, 2].map((n) => ({ name: batchName(course, n), course, instructor: instructors[(i + n) % instructors.length] })),
);
