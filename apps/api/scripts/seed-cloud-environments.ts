/**
 * One-shot seed against the Neon `cloud-environments` branch.
 *
 * Starts a non-watch API + svix webhook tunnel, provisions a 2-member Clerk
 * household, then writes accounts/transactions/settlements through the HTTP API.
 * Default is idempotent: reuse the canonical household and skip writes when
 * the fixture accounts, tags, and ledger already exist. `--variant` creates a
 * separate copy.
 * `--keep-running` leaves the API and svix tunnel up afterward.
 *
 *   pnpm --filter api seed:cloud-environments
 *   pnpm --filter api seed:cloud-environments -- --variant
 *
 * Requires apps/api/.env.cloud-environments (see .env.cloud-environments.example).
 * Do not point this at apps/api/.env — that is a different database.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createClerkClient,
  type ClerkClient,
  type Organization,
  type User,
} from '@clerk/backend';
import { lrmSplit } from '@ploutizo/utils';
import { formatGeneratedTransactionDescription } from '@ploutizo/utils/transaction-policy';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const API_ROOT = join(SCRIPT_DIR, '..');
const ENV_FILE = join(API_ROOT, '.env.cloud-environments');
const KEEP_RUNNING = process.argv.includes('--keep-running');
const CREATE_VARIANT = process.argv.includes('--variant');
const SEED_PASSWORD = 'Seed-Cloud-Env-424242!';
const CANONICAL_HOUSEHOLD_NAME = 'Cloud Env Seed Household';
const SEED_FIXTURE_META_KEY = 'ploutizoSeedFixture';
const CANONICAL_FIXTURE_ID = 'cloud-environments';
const VARIANT_FIXTURE_ID = 'cloud-environments-variant';
const EXPECTED_ACCOUNT_NAMES = [
  'Joint Chequing',
  "Ada's Chequing",
  'Joint Savings',
  "Ada's Visa",
  'Joint Visa',
  "Ada's Prepaid",
  "Alan's Interac",
  'Joint TFSA',
] as const;
const EXPECTED_TAG_NAMES = ['weekend', 'recurring'] as const;
/** 15 posted transactions plus the 2 settlements that persist as transactions. */
const EXPECTED_LEDGER_TRANSACTION_COUNT = 17;
const REQUIRED_ENV = [
  'DATABASE_URL',
  'CLERK_SECRET_KEY',
  'CLERK_PUBLISHABLE_KEY',
] as const;

const MEMBERS = [
  {
    email: 'ada+clerk_test@example.com',
    username: 'ada-cloud-env',
    firstName: 'Ada',
    lastName: 'Lovelace',
  },
  {
    email: 'alan+clerk_test@example.com',
    username: 'alan-cloud-env',
    firstName: 'Alan',
    lastName: 'Turing',
  },
] as const;

type MemberRow = {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  externalId: string;
};

type AccountRow = {
  id: string;
  name: string;
  type: string;
};

type CategoryRow = { id: string; name: string };
type TagRow = { id: string; name: string };

type Envelope<T> = { data: T };

const log = (message: string) => {
  console.log(`[seed] ${message}`);
};

const fail = (message: string): never => {
  throw new Error(message);
};

const clerkErrorHasCode = (err: unknown, code: string): boolean => {
  if (!err || typeof err !== 'object' || !('errors' in err)) return false;
  const errors = (err as { errors?: { code?: string }[] }).errors;
  return Array.isArray(errors) && errors.some((item) => item.code === code);
};

type SeedFixtureMeta = {
  ploutizoSeedFixture?: unknown;
  ploutizoSeedVariant?: unknown;
};

const readSeedMeta = (org: Organization): SeedFixtureMeta => {
  const privateMeta = (org.privateMetadata ?? {}) as SeedFixtureMeta;
  const publicMeta = (org.publicMetadata ?? {}) as SeedFixtureMeta;
  return { ...publicMeta, ...privateMeta };
};

const isCanonicalSeedOrg = (org: Organization): boolean => {
  const meta = readSeedMeta(org);
  if (meta.ploutizoSeedFixture === CANONICAL_FIXTURE_ID) return true;
  return (
    org.name === CANONICAL_HOUSEHOLD_NAME &&
    meta.ploutizoSeedFixture !== VARIANT_FIXTURE_ID
  );
};

const variantNumberFromOrg = (org: Organization): number | undefined => {
  const meta = readSeedMeta(org);
  if (meta.ploutizoSeedFixture !== VARIANT_FIXTURE_ID) return undefined;
  return typeof meta.ploutizoSeedVariant === 'number'
    ? meta.ploutizoSeedVariant
    : undefined;
};

const formatClerkError = (err: unknown): string => {
  if (err && typeof err === 'object' && 'errors' in err) {
    const errors = (
      err as {
        errors?: {
          code?: string;
          message?: string;
          longMessage?: string;
        }[];
      }
    ).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors
        .map(
          (item) =>
            `${item.code ?? 'error'}: ${item.longMessage ?? item.message ?? ''}`
        )
        .join('; ');
    }
  }
  return err instanceof Error ? err.message : String(err);
};

const parseEnvFile = (contents: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quote = value[0];
    if (
      (quote === '"' || quote === "'") &&
      value.length >= 2 &&
      value.endsWith(quote)
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
};

const loadCloudEnv = () => {
  if (!existsSync(ENV_FILE)) {
    fail(
      `Missing ${ENV_FILE}. Copy .env.cloud-environments.example and set DATABASE_URL to the Neon cloud-environments branch.`
    );
  }
  const parsed = parseEnvFile(readFileSync(ENV_FILE, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    fail(
      `Missing required keys in .env.cloud-environments: ${missing.join(', ')}`
    );
  }
  process.env.APP_ENV ??= 'local';
  process.env.PORT ??= '18080';
};

const isoDateDaysAgo = (daysAgo: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

const decodeJwtPayload = (jwt: string): Record<string, unknown> => {
  const payload = jwt.split('.')[1];
  if (!payload) fail('Session token is not a JWT');
  return JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8')
  ) as Record<string, unknown>;
};

const jwtOrgId = (jwt: string): string | undefined => {
  const payload = decodeJwtPayload(jwt);
  if (typeof payload.org_id === 'string') return payload.org_id;
  const nested = payload.o;
  if (nested && typeof nested === 'object' && 'id' in nested) {
    const id = (nested as { id?: unknown }).id;
    if (typeof id === 'string') return id;
  }
  return undefined;
};

const decodeFrontendApi = (publishableKey: string): string => {
  const encoded = publishableKey.replace(/^pk_(test|live)_/, '');
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const host = decoded.split('$')[0]?.replace(/\/$/, '');
  if (!host) fail('Could not decode CLERK_PUBLISHABLE_KEY Frontend API URL');
  return host.startsWith('http') ? host : `https://${host}`;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const apiChildExitLabel = (child: ChildProcess) =>
  child.signalCode ?? `code ${child.exitCode}`;

const assertApiChildAlive = (child: ChildProcess, baseUrl: string) => {
  if (child.exitCode === null && child.signalCode === null) return;
  fail(
    `API process exited before becoming healthy (${apiChildExitLabel(child)}). ${baseUrl} may already be in use by another process.`
  );
};

const waitForHealth = async (baseUrl: string, child: ChildProcess) => {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    assertApiChildAlive(child, baseUrl);
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) {
        const body = (await res.json()) as Envelope<{ status?: string }>;
        if (body.data?.status === 'ok') {
          // Occupied-port children can crash with EADDRINUSE after a health
          // response from the process that already owns the port.
          await wait(500);
          assertApiChildAlive(child, baseUrl);
          return;
        }
      }
    } catch {
      // API has not bound yet
    }
    await wait(400);
  }
  assertApiChildAlive(child, baseUrl);
  fail(`API did not become healthy at ${baseUrl}/health`);
};

const prefixChildOutput = (child: ChildProcess, label: string) => {
  const write = (chunk: Buffer, stream: NodeJS.WriteStream) => {
    const text = chunk.toString();
    for (const line of text.split(/\r?\n/)) {
      if (line.length > 0) stream.write(`[${label}] ${line}\n`);
    }
  };
  child.stdout?.on('data', (chunk: Buffer) => write(chunk, process.stdout));
  child.stderr?.on('data', (chunk: Buffer) => write(chunk, process.stderr));
};

const spawnApi = (port: string): ChildProcess => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: API_ROOT,
    env: { ...process.env, PORT: port, APP_ENV: 'local' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  prefixChildOutput(child, 'api');
  child.on('exit', (code, signal) => {
    if (code && code !== 0) {
      log(`API exited early (${signal ?? `code ${code}`})`);
    }
  });
  return child;
};

const extractPlayUrl = (text: string): string | undefined => {
  const match = text.match(/https:\/\/play\.svix\.com\/in\/[A-Za-z0-9_-]+\//);
  return match?.[0];
};

const spawnSvix = (
  apiBaseUrl: string
): { child: ChildProcess; playUrl: Promise<string | undefined> } => {
  const child = spawn('svix', ['listen', `${apiBaseUrl}/webhooks/clerk`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let settled = false;
  let resolvePlayUrl: (url: string | undefined) => void = () => undefined;
  const playUrl = new Promise<string | undefined>((resolve) => {
    resolvePlayUrl = resolve;
  });
  const buffer: string[] = [];
  const onData = (chunk: Buffer) => {
    const text = chunk.toString();
    buffer.push(text);
    process.stdout.write(
      text
        .split(/\r?\n/)
        .filter((line) => line.length > 0)
        .map((line) => `[svix] ${line}\n`)
        .join('')
    );
    const url = extractPlayUrl(buffer.join(''));
    if (url && !settled) {
      settled = true;
      resolvePlayUrl(url);
    }
  };
  child.stdout?.on('data', onData);
  child.stderr?.on('data', onData);
  child.on('exit', () => {
    if (!settled) {
      settled = true;
      resolvePlayUrl(extractPlayUrl(buffer.join('')));
    }
  });
  return { child, playUrl };
};

const stopChild = async (child: ChildProcess | undefined, label: string) => {
  if (!child?.pid || child.exitCode !== null) return;
  log(`Stopping ${label} (pid ${child.pid})`);
  child.kill('SIGTERM');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline && child.exitCode === null) {
    await wait(150);
  }
  if (child.exitCode === null) child.kill('SIGKILL');
};

const clerkFetch = async (
  path: string,
  init: RequestInit & { json?: unknown }
) => {
  const secret = process.env.CLERK_SECRET_KEY!;
  const { json, headers, ...rest } = init;
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    fail(
      `Clerk ${init.method ?? 'GET'} ${path} failed (${res.status}): ${JSON.stringify(body)}`
    );
  }
  return body;
};

const ensureUser = async (
  clerk: ClerkClient,
  spec: (typeof MEMBERS)[number]
): Promise<User> => {
  const existing = await clerk.users.getUserList({
    emailAddress: [spec.email],
    limit: 1,
  });
  if (existing.data[0]) {
    return clerk.users.updateUser(existing.data[0].id, {
      firstName: spec.firstName,
      lastName: spec.lastName,
      username: spec.username,
      password: SEED_PASSWORD,
      skipPasswordChecks: true,
    });
  }
  try {
    return await clerk.users.createUser({
      emailAddress: [spec.email],
      username: spec.username,
      firstName: spec.firstName,
      lastName: spec.lastName,
      password: SEED_PASSWORD,
      skipPasswordChecks: true,
    });
  } catch (err) {
    fail(`Failed to create Clerk user ${spec.email}: ${formatClerkError(err)}`);
  }
};

const mintOrgJwtViaBackend = async (
  clerk: ClerkClient,
  userId: string,
  orgId: string
): Promise<string | undefined> => {
  const session = await clerk.sessions.createSession({ userId });
  const tokenFromSdk = await clerk.sessions.getToken(session.id);
  if (jwtOrgId(tokenFromSdk.jwt) === orgId) return tokenFromSdk.jwt;

  const tokenWithOrg = await clerkFetch(`/sessions/${session.id}/tokens`, {
    method: 'POST',
    json: { expires_in_seconds: 600, organization_id: orgId },
  });
  const jwt =
    typeof tokenWithOrg.jwt === 'string' ? tokenWithOrg.jwt : undefined;
  if (jwt && jwtOrgId(jwt) === orgId) return jwt;
  return undefined;
};

const formBody = (params: Record<string, string>) =>
  new URLSearchParams(params).toString();

const mintOrgJwtViaFrontend = async (
  email: string,
  orgId: string
): Promise<string> => {
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY!;
  const frontendApi = decodeFrontendApi(publishableKey);
  const headers = {
    Authorization: `Bearer ${publishableKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const created = await fetch(`${frontendApi}/v1/client/sign_ins`, {
    method: 'POST',
    headers,
    body: formBody({ identifier: email }),
  });
  const createdJson = (await created.json()) as {
    response?: { id?: string };
    client?: unknown;
    errors?: unknown;
  };
  const signInId = createdJson.response?.id;
  if (!created.ok || !signInId) {
    fail(
      `Clerk Frontend sign-in create failed: ${JSON.stringify(createdJson)}`
    );
  }

  const attempted = await fetch(
    `${frontendApi}/v1/client/sign_ins/${signInId}/attempt_first_factor`,
    {
      method: 'POST',
      headers,
      body: formBody({ strategy: 'password', password: SEED_PASSWORD }),
    }
  );
  const cookies = attempted.headers.getSetCookie?.() ?? [];
  const attemptedJson = (await attempted.json()) as {
    response?: { created_session_id?: string; status?: string };
    client?: { sessions?: { id: string }[] };
    errors?: unknown;
  };
  if (!attempted.ok) {
    fail(
      `Clerk Frontend password attempt failed: ${JSON.stringify(attemptedJson)}`
    );
  }
  const sessionId =
    attemptedJson.response?.created_session_id ??
    attemptedJson.client?.sessions?.[0]?.id;
  if (!sessionId) {
    fail(
      `Clerk Frontend sign-in did not return a session: ${JSON.stringify(attemptedJson)}`
    );
  }

  const tokenRes = await fetch(
    `${frontendApi}/v1/client/sessions/${sessionId}/tokens`,
    {
      method: 'POST',
      headers: {
        ...headers,
        ...(cookies.length > 0 ? { Cookie: cookies.join('; ') } : {}),
      },
      body: formBody({ organization_id: orgId }),
    }
  );
  const tokenJson = (await tokenRes.json()) as {
    jwt?: string;
    errors?: unknown;
  };
  if (!tokenRes.ok || !tokenJson.jwt) {
    fail(`Clerk Frontend session token failed: ${JSON.stringify(tokenJson)}`);
  }
  if (jwtOrgId(tokenJson.jwt) !== orgId) {
    fail('Frontend session token is missing the household org_id claim');
  }
  return tokenJson.jwt;
};

const mintOrgJwt = async (
  clerk: ClerkClient,
  user: User,
  email: string,
  orgId: string
): Promise<string> => {
  const backendJwt = await mintOrgJwtViaBackend(clerk, user.id, orgId);
  if (backendJwt) return backendJwt;
  log(
    `Backend session token for ${user.firstName} had no org claim; using Frontend API`
  );
  return mintOrgJwtViaFrontend(email, orgId);
};

const createApiClient = (baseUrl: string, jwt: string) => {
  const requestJson = async <T>(
    method: string,
    path: string,
    json?: unknown
  ): Promise<T> => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${jwt}`,
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    });
    const body = (await res.json()) as T & {
      data?: T;
      error?: { code?: string; message?: string };
    };
    if (!res.ok) {
      fail(
        `${method} ${path} failed (${res.status} ${body.error?.code ?? ''}): ${body.error?.message ?? JSON.stringify(body)}`
      );
    }
    return body;
  };

  return {
    getData: async <T>(path: string): Promise<T> => {
      const body = await requestJson<Envelope<T>>('GET', path);
      return body.data;
    },
    getRaw: <T>(path: string) => requestJson<T>('GET', path),
    post: async <T>(path: string, json: unknown): Promise<T> => {
      const body = await requestJson<Envelope<T>>('POST', path, json);
      return body.data;
    },
  };
};

const solo = (memberId: string, amountCents: number) => [
  { memberId, amountCents, percentage: 100 },
];

const shared = (memberIds: [string, string], amountCents: number) =>
  lrmSplit(amountCents, memberIds);

const categoryByName = (categories: CategoryRow[], name: string): string => {
  const row = categories.find((c) => c.name === name);
  if (!row)
    fail(`Seeded category "${name}" was not returned by GET /api/categories`);
  return row.id;
};

const ensureTag = async (
  api: ReturnType<typeof createApiClient>,
  existing: TagRow[],
  name: string,
  colour: string
): Promise<TagRow> => {
  const found = existing.find((tag) => tag.name === name);
  if (found) return found;
  return api.post<TagRow>('/api/tags', { name, colour });
};

const seedHousehold = async (
  api: ReturnType<typeof createApiClient>,
  members: { ada: MemberRow; alan: MemberRow }
) => {
  const categories = await api.getData<CategoryRow[]>('/api/categories');
  const groceries = categoryByName(categories, 'Groceries');
  const dining = categoryByName(categories, 'Dining & Restaurants');
  const transportation = categoryByName(categories, 'Transportation');
  const utilities = categoryByName(categories, 'Utilities');
  const entertainment = categoryByName(categories, 'Entertainment');
  const shopping = categoryByName(categories, 'Shopping');
  const travel = categoryByName(categories, 'Travel');
  const personalCare = categoryByName(categories, 'Personal Care');

  const existingTags = await api.getData<TagRow[]>('/api/tags');
  const weekend = await ensureTag(api, existingTags, 'weekend', 'blue-500');
  const recurring = await ensureTag(
    api,
    existingTags,
    'recurring',
    'violet-500'
  );

  const { ada, alan } = members;
  const both: [string, string] = [ada.id, alan.id];

  const jointChequing = await api.post<AccountRow>('/api/accounts', {
    name: 'Joint Chequing',
    type: 'chequing',
    institution: 'EQ Bank',
    lastFour: '4410',
    memberIds: both,
  });
  const adaChequing = await api.post<AccountRow>('/api/accounts', {
    name: "Ada's Chequing",
    type: 'chequing',
    institution: 'Tangerine',
    lastFour: '1188',
    memberIds: [ada.id],
  });
  const jointSavings = await api.post<AccountRow>('/api/accounts', {
    name: 'Joint Savings',
    type: 'savings',
    institution: 'EQ Bank',
    lastFour: '9021',
    memberIds: both,
  });
  const adaVisa = await api.post<AccountRow>('/api/accounts', {
    name: "Ada's Visa",
    type: 'credit_card',
    institution: 'Tangerine',
    lastFour: '4242',
    memberIds: [ada.id],
  });
  const jointVisa = await api.post<AccountRow>('/api/accounts', {
    name: 'Joint Visa',
    type: 'credit_card',
    institution: 'Amex',
    lastFour: '1005',
    memberIds: both,
  });
  const adaPrepaid = await api.post<AccountRow>('/api/accounts', {
    name: "Ada's Prepaid",
    type: 'prepaid_cash',
    memberIds: [ada.id],
  });
  const alanETransfer = await api.post<AccountRow>('/api/accounts', {
    name: "Alan's Interac",
    type: 'e_transfer',
    memberIds: [alan.id],
  });
  const tfsa = await api.post<AccountRow>('/api/accounts', {
    name: 'Joint TFSA',
    type: 'investment',
    institution: 'Wealthsimple',
    memberIds: both,
  });

  await api.post('/api/transactions', {
    type: 'income',
    accountId: jointChequing.id,
    amount: 350_000,
    date: isoDateDaysAgo(14),
    description: 'Ada salary',
    incomeType: 'direct_deposit',
    assignees: solo(ada.id, 350_000),
    tagIds: [recurring.id],
  });
  await api.post('/api/transactions', {
    type: 'income',
    accountId: jointChequing.id,
    amount: 320_000,
    date: isoDateDaysAgo(14),
    description: 'Alan salary',
    incomeType: 'direct_deposit',
    assignees: solo(alan.id, 320_000),
    tagIds: [recurring.id],
  });
  await api.post('/api/transactions', {
    type: 'expense',
    accountId: jointChequing.id,
    amount: 12_500,
    date: isoDateDaysAgo(10),
    description: 'Hydro One',
    categoryId: utilities,
    assignees: shared(both, 12_500),
    tagIds: [recurring.id],
  });
  await api.post('/api/transactions', {
    type: 'transfer',
    accountId: jointChequing.id,
    counterpartAccountId: jointSavings.id,
    amount: 50_000,
    date: isoDateDaysAgo(8),
    description: formatGeneratedTransactionDescription({
      type: 'transfer',
      accountName: jointChequing.name,
      counterpartAccountName: jointSavings.name,
    }),
    assignees: shared(both, 50_000),
  });
  await api.post('/api/transactions', {
    type: 'contribution',
    accountId: jointChequing.id,
    counterpartAccountId: tfsa.id,
    amount: 20_000,
    date: isoDateDaysAgo(7),
    description: formatGeneratedTransactionDescription({
      type: 'contribution',
      accountName: jointChequing.name,
      counterpartAccountName: tfsa.name,
    }),
    assignees: shared(both, 20_000),
  });
  await api.post('/api/transactions', {
    type: 'expense',
    accountId: adaChequing.id,
    amount: 2_400,
    date: isoDateDaysAgo(6),
    description: 'Coffee shop',
    categoryId: dining,
    assignees: solo(ada.id, 2_400),
  });
  await api.post('/api/transactions', {
    type: 'expense',
    accountId: adaPrepaid.id,
    amount: 1_200,
    date: isoDateDaysAgo(5),
    description: 'Pharmacy',
    categoryId: personalCare,
    assignees: solo(ada.id, 1_200),
  });
  await api.post('/api/transactions', {
    type: 'expense',
    accountId: alanETransfer.id,
    amount: 3_500,
    date: isoDateDaysAgo(5),
    description: 'Presto reload',
    categoryId: transportation,
    assignees: solo(alan.id, 3_500),
  });

  await api.post('/api/transactions', {
    type: 'expense',
    accountId: adaVisa.id,
    amount: 12_000,
    date: isoDateDaysAgo(9),
    description: 'Loblaws',
    categoryId: groceries,
    assignees: solo(ada.id, 12_000),
  });
  const diningExpense = await api.post<{ id: string }>('/api/transactions', {
    type: 'expense',
    accountId: adaVisa.id,
    amount: 4_500,
    date: isoDateDaysAgo(6),
    description: 'Pizzeria',
    categoryId: dining,
    assignees: solo(ada.id, 4_500),
    tagIds: [weekend.id],
  });
  await api.post('/api/transactions', {
    type: 'expense',
    accountId: adaVisa.id,
    amount: 8_000,
    date: isoDateDaysAgo(4),
    description: 'Airbnb',
    categoryId: travel,
    assignees: shared(both, 8_000),
  });
  await api.post('/api/transactions', {
    type: 'refund',
    accountId: adaVisa.id,
    amount: 1_500,
    date: isoDateDaysAgo(3),
    description: 'Pizzeria refund',
    categoryId: dining,
    refundOf: diningExpense.id,
    assignees: solo(ada.id, 1_500),
  });

  await api.post('/api/transactions', {
    type: 'expense',
    accountId: jointVisa.id,
    amount: 20_000,
    date: isoDateDaysAgo(8),
    description: 'Costco',
    categoryId: groceries,
    assignees: shared(both, 20_000),
  });
  await api.post('/api/transactions', {
    type: 'expense',
    accountId: jointVisa.id,
    amount: 6_000,
    date: isoDateDaysAgo(5),
    description: 'Cinema',
    categoryId: entertainment,
    assignees: solo(ada.id, 6_000),
    tagIds: [weekend.id],
  });
  await api.post('/api/transactions', {
    type: 'expense',
    accountId: jointVisa.id,
    amount: 4_000,
    date: isoDateDaysAgo(4),
    description: 'Uniqlo',
    categoryId: shopping,
    assignees: solo(alan.id, 4_000),
  });

  await api.post('/api/settlements', {
    assignees: [{ memberId: ada.id }],
    accountId: adaVisa.id,
    counterpartAccountId: adaChequing.id,
    amountCents: 5_000,
    date: isoDateDaysAgo(1),
    notes: 'Partial personal paydown — balance should remain',
  });
  await api.post('/api/settlements', {
    assignees: both.map((memberId) => ({ memberId })),
    accountId: jointVisa.id,
    counterpartAccountId: jointChequing.id,
    amountCents: 8_000,
    date: isoDateDaysAgo(1),
    notes: 'Partial shared paydown — balance should remain',
  });

  const settlements = await api.getRaw<{
    accounts: {
      account: { name: string };
      totalBalanceCents: number;
      sharedBalanceCents: number;
      members: {
        member: { name: string };
        personalBalanceCents: number;
      }[];
    }[];
  }>('/api/settlements');

  return { settlements };
};

const pickMember = (
  rows: MemberRow[],
  clerkUserId: string,
  label: string
): MemberRow => {
  const row = rows.find((m) => m.externalId === clerkUserId);
  if (!row) fail(`Expected household member ${label} after Clerk sync`);
  return row;
};

const listUserOrganizations = async (
  clerk: ClerkClient,
  userId: string
): Promise<Organization[]> => {
  const orgs: Organization[] = [];
  let offset = 0;
  for (;;) {
    const page = await clerk.users.getOrganizationMembershipList({
      userId,
      limit: 100,
      offset,
    });
    for (const membership of page.data) {
      orgs.push(
        await clerk.organizations.getOrganization({
          organizationId: membership.organization.id,
        })
      );
    }
    if (offset + 100 >= page.totalCount) break;
    offset += 100;
  }
  return orgs;
};

const stampSeedMetadata = async (
  clerk: ClerkClient,
  org: Organization,
  fixtureId: string,
  variant?: number
): Promise<Organization> => {
  const current = (org.privateMetadata ?? {}) as Record<string, unknown>;
  if (
    current[SEED_FIXTURE_META_KEY] === fixtureId &&
    (variant === undefined || current.ploutizoSeedVariant === variant)
  ) {
    return org;
  }
  try {
    return await clerk.organizations.updateOrganizationMetadata(org.id, {
      privateMetadata: {
        ...current,
        [SEED_FIXTURE_META_KEY]: fixtureId,
        ...(variant === undefined ? {} : { ploutizoSeedVariant: variant }),
      },
    });
  } catch (err) {
    fail(
      `Failed to stamp seed metadata on ${org.id}: ${formatClerkError(err)}`
    );
  }
};

const ensureOrgMembership = async (
  clerk: ClerkClient,
  orgId: string,
  userId: string,
  email: string
) => {
  try {
    await clerk.organizations.createOrganizationMembership({
      organizationId: orgId,
      userId,
      role: 'org:admin',
    });
  } catch (err) {
    if (
      clerkErrorHasCode(err, 'already_a_member_in_organization') ||
      clerkErrorHasCode(err, 'already_a_member_of_this_org')
    ) {
      return;
    }
    fail(`Failed to add ${email} to household: ${formatClerkError(err)}`);
  }
};

const resolveSeedHousehold = async (
  clerk: ClerkClient,
  adaUser: User,
  alanUser: User
): Promise<{ org: Organization; created: boolean }> => {
  const adaOrgs = await listUserOrganizations(clerk, adaUser.id);

  if (CREATE_VARIANT) {
    const nextVariant =
      adaOrgs.reduce((max, org) => {
        const n = variantNumberFromOrg(org);
        return n !== undefined && n > max ? n : max;
      }, 0) + 1;
    try {
      const org = await clerk.organizations.createOrganization({
        name: `${CANONICAL_HOUSEHOLD_NAME} variant ${nextVariant}`,
        createdBy: adaUser.id,
        privateMetadata: {
          [SEED_FIXTURE_META_KEY]: VARIANT_FIXTURE_ID,
          ploutizoSeedVariant: nextVariant,
        },
      });
      await ensureOrgMembership(clerk, org.id, alanUser.id, MEMBERS[1].email);
      return { org, created: true };
    } catch (err) {
      fail(`Failed to create seed variant household: ${formatClerkError(err)}`);
    }
  }

  const tagged = adaOrgs
    .filter(
      (org) => readSeedMeta(org).ploutizoSeedFixture === CANONICAL_FIXTURE_ID
    )
    .sort((a, b) => a.createdAt - b.createdAt);
  const named = adaOrgs
    .filter(isCanonicalSeedOrg)
    .sort((a, b) => a.createdAt - b.createdAt);
  const existing = tagged[0] ?? named[0];
  if (existing) {
    const org = await stampSeedMetadata(clerk, existing, CANONICAL_FIXTURE_ID);
    await ensureOrgMembership(clerk, org.id, alanUser.id, MEMBERS[1].email);
    return { org, created: false };
  }

  try {
    const org = await clerk.organizations.createOrganization({
      name: CANONICAL_HOUSEHOLD_NAME,
      createdBy: adaUser.id,
      privateMetadata: {
        [SEED_FIXTURE_META_KEY]: CANONICAL_FIXTURE_ID,
      },
    });
    await ensureOrgMembership(clerk, org.id, alanUser.id, MEMBERS[1].email);
    return { org, created: true };
  } catch (err) {
    fail(`Failed to create Clerk household: ${formatClerkError(err)}`);
  }
};

const fixtureStatus = ({
  accounts,
  tags,
  transactionCount,
}: {
  accounts: { name: string }[];
  tags: { name: string }[];
  transactionCount: number;
}): 'empty' | 'complete' | 'partial' => {
  const accountNames = new Set(accounts.map((account) => account.name));
  const presentAccounts = EXPECTED_ACCOUNT_NAMES.filter((name) =>
    accountNames.has(name)
  );
  const tagNames = new Set(tags.map((tag) => tag.name));
  const presentTags = EXPECTED_TAG_NAMES.filter((name) => tagNames.has(name));
  const ledgerComplete =
    presentTags.length === EXPECTED_TAG_NAMES.length &&
    transactionCount >= EXPECTED_LEDGER_TRANSACTION_COUNT;

  if (presentAccounts.length === 0) return 'empty';
  if (
    presentAccounts.length === EXPECTED_ACCOUNT_NAMES.length &&
    ledgerComplete
  ) {
    return 'complete';
  }
  return 'partial';
};

const printSettlementSnapshot = (settlements: {
  accounts: {
    account: { name: string };
    totalBalanceCents: number;
    sharedBalanceCents: number;
    members: {
      member: { name: string };
      personalBalanceCents: number;
    }[];
  }[];
}) => {
  for (const row of settlements.accounts) {
    const personal = row.members
      .map((m) => `${m.member.name} personal ${m.personalBalanceCents}¢`)
      .join(', ');
    log(
      `  ${row.account.name}: total ${row.totalBalanceCents}¢ / shared ${row.sharedBalanceCents}¢ (${personal})`
    );
  }
};

const syncHouseholdMembers = async (
  adaApi: ReturnType<typeof createApiClient>,
  alanApi: ReturnType<typeof createApiClient>,
  adaUser: User,
  alanUser: User
) => {
  const deadline = Date.now() + 20_000;
  let memberRows: MemberRow[] = [];
  while (Date.now() < deadline) {
    await alanApi.getData<MemberRow[]>('/api/households/members');
    memberRows = await adaApi.getData<MemberRow[]>('/api/households/members');
    if (memberRows.length >= 2) break;
    await wait(500);
  }
  if (memberRows.length < 2) {
    fail(`Household has ${memberRows.length} member(s) after sync; expected 2`);
  }
  return {
    ada: pickMember(memberRows, adaUser.id, 'Ada'),
    alan: pickMember(memberRows, alanUser.id, 'Alan'),
  };
};

const main = async () => {
  loadCloudEnv();
  const port = process.env.PORT!;
  const apiBaseUrl = `http://localhost:${port}`;
  const expectedRelay = process.env.CLERK_WEBHOOK_RELAY_URL?.replace(
    /\/?$/,
    '/'
  );

  let apiChild: ChildProcess | undefined;
  let svixChild: ChildProcess | undefined;
  let succeeded = false;

  const shutdown = async () => {
    await stopChild(svixChild, 'svix');
    await stopChild(apiChild, 'api');
  };

  process.once('SIGINT', () => {
    void shutdown().finally(() => process.exit(130));
  });
  process.once('SIGTERM', () => {
    void shutdown().finally(() => process.exit(143));
  });

  try {
    log(`Starting API on ${apiBaseUrl} with ${ENV_FILE}`);
    apiChild = spawnApi(port);
    await waitForHealth(apiBaseUrl, apiChild);

    log('Starting svix listen for Clerk webhooks');
    const svix = spawnSvix(apiBaseUrl);
    svixChild = svix.child;
    svixChild.on('error', (err) => {
      log(
        `svix CLI failed to start (${err.message}). Clerk webhooks will not reach this API; tenantGuard will still backfill both callers.`
      );
    });
    const playUrl = await Promise.race([
      svix.playUrl,
      wait(8_000).then(() => undefined),
    ]);
    if (playUrl) {
      log(`Svix relay: ${playUrl}`);
      const normalizedPlay = playUrl.replace(/\/?$/, '/');
      if (expectedRelay && normalizedPlay !== expectedRelay) {
        log(
          'Relay URL differs from CLERK_WEBHOOK_RELAY_URL. Clerk will not hit this tunnel unless the dashboard endpoint is updated. Member rows still sync via tenantGuard when each user calls the API.'
        );
      }
    } else {
      log(
        'svix listen did not print a Play URL in time; continuing with tenantGuard member sync'
      );
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });

    log('Provisioning Clerk users and household');
    const adaUser = await ensureUser(clerk, MEMBERS[0]);
    const alanUser = await ensureUser(clerk, MEMBERS[1]);
    const { org, created } = await resolveSeedHousehold(
      clerk,
      adaUser,
      alanUser
    );

    const adaJwt = await mintOrgJwt(clerk, adaUser, MEMBERS[0].email, org.id);
    const alanJwt = await mintOrgJwt(clerk, alanUser, MEMBERS[1].email, org.id);
    const adaApi = createApiClient(apiBaseUrl, adaJwt);
    const alanApi = createApiClient(apiBaseUrl, alanJwt);

    log('Syncing both members through authenticated API calls');
    const { ada, alan } = await syncHouseholdMembers(
      adaApi,
      alanApi,
      adaUser,
      alanUser
    );
    log(`Household ${org.id}: ${ada.displayName} + ${alan.displayName}`);

    const [existingAccounts, existingTags, transactionPage] = await Promise.all(
      [
        adaApi.getData<AccountRow[]>('/api/accounts'),
        adaApi.getData<TagRow[]>('/api/tags'),
        adaApi.getRaw<{ total: number }>('/api/transactions?limit=1'),
      ]
    );
    const status = fixtureStatus({
      accounts: existingAccounts,
      tags: existingTags,
      transactionCount: transactionPage.total ?? 0,
    });
    if (status === 'complete') {
      log(
        created
          ? 'Fixture already present on the new household; skipping writes.'
          : 'Canonical seed household already has fixture data; skipping writes. Pass --variant for a separate copy.'
      );
      const settlements = await adaApi.getRaw<{
        accounts: {
          account: { name: string };
          totalBalanceCents: number;
          sharedBalanceCents: number;
          members: {
            member: { name: string };
            personalBalanceCents: number;
          }[];
        }[];
      }>('/api/settlements');
      log('Settlement snapshot:');
      printSettlementSnapshot(settlements);
      log(
        `Sign in as ${MEMBERS[0].email} or ${MEMBERS[1].email} (code 424242).`
      );
      log(`Household org id: ${org.id}`);
      succeeded = true;
      return;
    }
    if (status === 'partial') {
      const present = existingAccounts
        .map((account) => account.name)
        .join(', ');
      const presentTags = existingTags.map((tag) => tag.name).join(', ');
      fail(
        `Household ${org.id} has a partial seed (accounts: ${present || 'none'}; tags: ${presentTags || 'none'}; transactions: ${transactionPage.total ?? 0}). Refusing to add more transactions. Pass --variant to create a clean copy.`
      );
    }

    const { settlements } = await seedHousehold(adaApi, { ada, alan });

    log('Seed complete. Settlement snapshot:');
    printSettlementSnapshot(settlements);
    log(`Sign in as ${MEMBERS[0].email} or ${MEMBERS[1].email} (code 424242).`);
    log(`Household org id: ${org.id}`);
    succeeded = true;
  } finally {
    if (KEEP_RUNNING && succeeded) {
      log(
        `Leaving API (${apiBaseUrl}) and svix running. Ctrl+C in this terminal to stop.`
      );
      await new Promise(() => undefined);
    } else {
      await shutdown();
    }
  }
};

void main().catch((err) => {
  console.error(formatClerkError(err));
  process.exitCode = 1;
});
