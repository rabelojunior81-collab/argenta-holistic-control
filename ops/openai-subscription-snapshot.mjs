#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const execFileAsync = promisify(execFile);
const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const STATE_PATH = join(ROOT, 'ops', 'openai-subscription-state.json');
const EVENTS_PATH = join(ROOT, 'ops', 'events.jsonl');
const CONFIG_PATH = join(process.env.USERPROFILE || '', '.openclaw', 'openclaw.json');
const OPENCLAW_BIN = join(process.env.APPDATA || '', 'npm', process.platform === 'win32' ? 'openclaw.cmd' : 'openclaw');

function pctRemaining(usedPercent) {
  if (typeof usedPercent !== 'number') return null;
  return Math.max(0, Math.min(100, 100 - usedPercent));
}

function fmtReset(ts) {
  if (!ts) return null;
  try { return new Date(ts).toISOString(); } catch { return null; }
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

async function loadConfiguredModel() {
  if (!existsSync(CONFIG_PATH)) return { provider: null, model: null, raw: null };
  const cfg = safeJson(await readFile(CONFIG_PATH, 'utf8'));
  const raw = cfg?.agents?.list?.find?.(a => a.id === 'main')?.model?.primary
    ?? cfg?.agents?.defaults?.model?.primary
    ?? null;
  if (!raw || !String(raw).includes('/')) return { provider: null, model: raw, raw };
  const [provider, model] = String(raw).split('/', 2);
  return { provider, model, raw };
}

async function loadPreviousState() {
  if (!existsSync(STATE_PATH)) return null;
  return safeJson(await readFile(STATE_PATH, 'utf8'));
}

async function collect() {
  const [{ stdout: statusRaw }, configured, previous] = await Promise.all([
    execFileAsync(process.platform === 'win32' ? 'cmd.exe' : OPENCLAW_BIN, process.platform === 'win32' ? ['/c', OPENCLAW_BIN, 'status', '--json', '--usage'] : ['status', '--json', '--usage'], { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }),
    loadConfiguredModel(),
    loadPreviousState(),
  ]);

  const status = safeJson(statusRaw);
  if (!status) throw new Error('Failed to parse `openclaw status --json --usage`');

  const usageProviders = Array.isArray(status?.usage?.providers) ? status.usage.providers : [];
  const openaiUsage = usageProviders.find(p => p.provider === 'openai-codex' || p.provider === 'openai');
  const fiveHour = openaiUsage?.windows?.find?.(w => /5h/i.test(w.label));
  const week = openaiUsage?.windows?.find?.(w => /week/i.test(w.label));
  const recentMain = Array.isArray(status?.sessions?.recent)
    ? status.sessions.recent.find(s => s.key === 'agent:main:main') || status.sessions.recent.find(s => s.agentId === 'main')
    : null;

  const health = [];
  if (!openaiUsage) health.push('provider_not_visible');
  if (configured.provider && configured.provider !== 'openai-codex' && configured.provider !== 'openai') health.push('provider_not_openai_family');
  if (recentMain?.model && configured.model && recentMain.model !== configured.model) health.push('model_mismatch');

  const state = {
    timestamp: new Date().toISOString(),
    source: 'openclaw status --json --usage',
    provider: {
      configured: configured.provider,
      effective: openaiUsage?.provider ?? configured.provider ?? null,
      displayName: openaiUsage?.displayName ?? null,
      authMode: (openaiUsage?.provider === 'openai-codex') ? 'oauth' : (openaiUsage?.provider === 'openai' ? 'api_key_or_other' : null),
      plan: openaiUsage?.plan ?? null,
    },
    model: {
      configured: configured.raw,
      effective: recentMain?.model ? `${openaiUsage?.provider ?? configured.provider ?? 'unknown'}/${recentMain.model}` : configured.raw,
      sessionModel: recentMain?.model ?? null,
      defaultModelAlias: status?.sessions?.defaults?.model ?? null,
      contextTokens: recentMain?.contextTokens ?? status?.sessions?.defaults?.contextTokens ?? null,
    },
    usage: {
      fiveHour: fiveHour ? {
        usedPercent: fiveHour.usedPercent ?? null,
        remainingPercent: pctRemaining(fiveHour.usedPercent),
        resetAt: fmtReset(fiveHour.resetAt),
      } : null,
      week: week ? {
        usedPercent: week.usedPercent ?? null,
        remainingPercent: pctRemaining(week.usedPercent),
        resetAt: fmtReset(week.resetAt),
      } : null,
      providers: usageProviders,
    },
    session: {
      key: recentMain?.key ?? null,
      updatedAt: recentMain?.updatedAt ? new Date(recentMain.updatedAt).toISOString() : null,
      inputTokens: recentMain?.inputTokens ?? null,
      outputTokens: recentMain?.outputTokens ?? null,
      cacheRead: recentMain?.cacheRead ?? null,
      cacheWrite: recentMain?.cacheWrite ?? null,
      totalTokens: recentMain?.totalTokens ?? null,
      remainingTokens: recentMain?.remainingTokens ?? null,
      percentUsed: recentMain?.percentUsed ?? null,
    },
    alerts: {
      items: [
        ...(health.length ? health : []),
        ...(fiveHour?.usedPercent >= 60 ? ['five_hour_pressure'] : []),
        ...(fiveHour?.usedPercent >= 85 ? ['five_hour_critical'] : []),
        ...(week?.usedPercent >= 65 ? ['week_pressure'] : []),
        ...(week?.usedPercent >= 90 ? ['week_critical'] : []),
      ],
    },
  };

  state.health = state.alerts.items.some(x => /critical|mismatch|provider_not_visible/.test(x))
    ? 'degraded'
    : state.alerts.items.length ? 'warn' : 'ok';

  if (previous) {
    state.delta = {
      providerChanged: previous?.provider?.effective !== state.provider.effective,
      modelChanged: previous?.model?.effective !== state.model.effective,
      fiveHourUsedDelta: (state.usage.fiveHour?.usedPercent ?? null) !== (previous?.usage?.fiveHour?.usedPercent ?? null)
        ? ((state.usage.fiveHour?.usedPercent ?? 0) - (previous?.usage?.fiveHour?.usedPercent ?? 0))
        : 0,
      weekUsedDelta: (state.usage.week?.usedPercent ?? null) !== (previous?.usage?.week?.usedPercent ?? null)
        ? ((state.usage.week?.usedPercent ?? 0) - (previous?.usage?.week?.usedPercent ?? 0))
        : 0,
    };
  } else {
    state.delta = null;
  }

  return state;
}

async function persist(state) {
  await mkdir(join(ROOT, 'ops'), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

  const ev = {
    ts: state.timestamp,
    event: 'openai_subscription_snapshot',
    provider: state.provider.effective,
    model: state.model.effective,
    health: state.health,
    fiveHourRemainingPct: state.usage.fiveHour?.remainingPercent ?? null,
    weekRemainingPct: state.usage.week?.remainingPercent ?? null,
    alerts: state.alerts.items,
  };
  await appendFile(EVENTS_PATH, JSON.stringify(ev) + '\n', 'utf8');
}

const shouldPersist = process.argv.includes('--persist');
const state = await collect();
if (shouldPersist) await persist(state);
console.log(JSON.stringify(state, null, 2));