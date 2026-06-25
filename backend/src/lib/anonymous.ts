import crypto from "node:crypto";

const adjectives = [
  "Silent", "Moon", "Blue", "Echo", "Velvet", "Neon", "Kind", "Wild", 
  "Nova", "Hidden", "Bright", "Clever", "Cosmic", "Solar", "Lunar", 
  "Mystic", "Frost", "Shadow", "Aero", "Pulse", "Radiant", "Quantum", 
  "Amber", "Golden", "Alpha", "Onyx", "Spectral", "Infra", "Vivid"
];

const nouns = [
  "Tiger", "Walker", "Wolf", "Soul", "River", "Signal", "Comet", "Pulse", 
  "Muse", "Orbit", "Spark", "Harbor", "Phoenix", "Falcon", "Seeker", 
  "Nomad", "Rider", "Beacon", "Zenith", "Vertex", "Drifter", "Voyager", 
  "Vortex", "Echo", "Stardust", "Atlas", "Nebula", "Ranger", "Aura"
];

export function generateAnonymousUsername() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  // Generate a random 6-digit integer suffix (100,000 to 999,999)
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `${adjective}${noun}${suffix}`;
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function normalizeCollege(college: string) {
  return college.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
