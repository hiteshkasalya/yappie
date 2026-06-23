const blockedTerms = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "slut",
  "whore",
  "cunt",
  "dick",
  "pussy",
  "nigger",
  "faggot"
];

const suspiciousContactPatterns = [
  /\b\d{10,}\b/g,
  /\b(?:instagram|insta|snapchat|telegram|whatsapp|phone number)\b/gi,
  /@[a-z0-9_.]{3,}/gi
];

export function cleanMessage(input: string) {
  let message = input.trim().slice(0, 700);

  for (const term of blockedTerms) {
    const pattern = new RegExp(`\\b${term}\\b`, "gi");
    message = message.replace(pattern, "*".repeat(Math.min(term.length, 6)));
  }

  for (const pattern of suspiciousContactPatterns) {
    message = message.replace(pattern, "[removed]");
  }

  return message;
}

export function isTextOnlyPayload(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isMessageTooLong(value: string) {
  return value.length > 700;
}
