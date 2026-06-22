interface SmokeResult {
  name: string;
  ok: boolean;
  detail: string;
}

const COMMAND_PAYLOAD = {
  text: "make it bounce",
  context: {
    styleId: "trap",
    styleName: "Atlanta Trap",
    bpm: 140,
    swingPercent: 8,
    activeSteps: 12,
    densityLevel: "medium",
    densitySummary: "A medium-density starter pattern.",
    pocketSummary: "Kick and snare are locked.",
    tryThis: "Add hats before the snare.",
    activeLanes: ["kick", "snare", "hat"],
    laneHitCounts: { kick: 3, snare: 2, hat: 8 },
    arrangementBars: 4,
    arrangementSections: { intro: 1, main: 1, variation: 1, outro: 1 },
  },
};

const COACH_PAYLOAD = {
  question: "What should I add next?",
  context: COMMAND_PAYLOAD.context,
};

async function main(): Promise<void> {
  const baseUrl = normalizeBaseUrl(process.argv[2] ?? process.env.AI_SMOKE_BASE_URL);
  if (!baseUrl) {
    console.error("Usage: npm run smoke:ai -- https://your-deployment.vercel.app");
    process.exit(1);
  }

  const results = await Promise.all([
    smokeHealth(baseUrl),
    smokeCommand(baseUrl),
    smokeCoach(baseUrl),
  ]);

  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}: ${result.detail}`);
  }

  if (results.some((result) => !result.ok)) {
    process.exit(1);
  }
}

async function smokeHealth(baseUrl: string): Promise<SmokeResult> {
  try {
    const response = await fetch(`${baseUrl}/api/ai-health`, {
      headers: basicAuthHeader(),
    });
    const payload = await readJson(response);
    if (!response.ok || !isRecord(payload)) {
      return { name: "ai-health", ok: false, detail: `HTTP ${response.status}` };
    }
    return {
      name: "ai-health",
      ok: typeof payload.provider === "string" && typeof payload.configured === "boolean",
      detail: `provider=${String(payload.provider)} configured=${String(payload.configured)}`,
    };
  } catch (error) {
    return failure("ai-health", error);
  }
}

async function smokeCommand(baseUrl: string): Promise<SmokeResult> {
  try {
    const response = await postJson(`${baseUrl}/api/command`, COMMAND_PAYLOAD);
    const payload = await readJson(response);
    if (!response.ok) {
      return { name: "command", ok: false, detail: `HTTP ${response.status}` };
    }
    const action = isRecord(payload) ? payload.action : null;
    const kind = isRecord(action) ? action.kind : null;
    return {
      name: "command",
      ok: response.ok && typeof kind === "string",
      detail: `HTTP ${response.status} action=${String(kind ?? "missing")}`,
    };
  } catch (error) {
    return failure("command", error);
  }
}

async function smokeCoach(baseUrl: string): Promise<SmokeResult> {
  try {
    const response = await postJson(`${baseUrl}/api/coach`, COACH_PAYLOAD);
    const payload = await readJson(response);
    if (!response.ok) {
      return { name: "coach", ok: false, detail: `HTTP ${response.status}` };
    }
    const answer = isRecord(payload) ? payload.answer : null;
    return {
      name: "coach",
      ok: response.ok && typeof answer === "string" && answer.trim().length > 0,
      detail: `HTTP ${response.status} answer=${typeof answer === "string" ? "present" : "missing"}`,
    };
  } catch (error) {
    return failure("coach", error);
  }
}

function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...basicAuthHeader(),
    },
    body: JSON.stringify(body),
  });
}

function basicAuthHeader(): Record<string, string> {
  const user = process.env.AI_SMOKE_BASIC_AUTH_USER;
  const password = process.env.AI_SMOKE_BASIC_AUTH_PASSWORD;
  if (!user || !password) {
    return {};
  }
  return {
    Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
  };
}

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : null;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function failure(name: string, error: unknown): SmokeResult {
  return {
    name,
    ok: false,
    detail: error instanceof Error ? error.message : "request failed",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

void main();
