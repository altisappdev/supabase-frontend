function normalizeEnvValue(value?: string | null) {
  if (!value) {
    return undefined;
  }

  return value.trim().replace(/^['"]|['"]$/g, "");
}

export function getOptionalEnv(name: string | string[], fallback?: string) {
  const names = Array.isArray(name) ? name : [name];

  for (const item of names) {
    const value = normalizeEnvValue(process.env[item]);

    if (value) {
      return value;
    }
  }

  return fallback;
}

export function getRequiredEnv(name: string | string[]) {
  const value = getOptionalEnv(name);

  if (!value) {
    const names = Array.isArray(name) ? name.join(", ") : name;
    throw new Error(`Missing required environment variable: ${names}`);
  }

  return value;
}

export function getBooleanEnv(name: string, fallback = false) {
  const value = getOptionalEnv(name);

  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

export function getNumberEnv(name: string, fallback?: number) {
  const value = getOptionalEnv(name);

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
