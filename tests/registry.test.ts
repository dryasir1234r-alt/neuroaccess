import { describe, expect, it } from 'vitest';
import { FEATURE_FLAG_KEYS } from '@/lib/features/engine';
import { FLAG_DEFINITIONS } from '@/lib/features/definitions';
import { TRANSITIONS } from '@/lib/journey/transitions';
import { JOURNEY_COMMANDS, JOURNEY_STAGES } from '@/lib/domain/journey';

describe('registry integrity', () => {
  it('declares a definition for every feature-flag key', () => {
    for (const key of FEATURE_FLAG_KEYS) {
      expect(FLAG_DEFINITIONS[key], `missing definition for ${key}`).toBeDefined();
      expect(FLAG_DEFINITIONS[key]?.key).toBe(key);
    }
  });

  it('declares all 40 required flags', () => {
    expect(FEATURE_FLAG_KEYS.length).toBe(40);
  });

  it('keeps clinical AI flags disabled by default', () => {
    const aiFlags = FEATURE_FLAG_KEYS.filter((k) => /^clinical|^ai|Transcription|Drafting|Detection|SafetyLayer|Provider/.test(k));
    for (const key of aiFlags) {
      const def = FLAG_DEFINITIONS[key];
      expect(['DISABLED', 'DEVELOPMENT_ONLY'], `${key} should not be production-enabled`).toContain(
        def?.defaultState,
      );
    }
  });

  it('every journey transition targets a real stage and references a real command', () => {
    for (const t of TRANSITIONS) {
      expect(JOURNEY_STAGES).toContain(t.to);
      expect(JOURNEY_COMMANDS).toContain(t.command);
      for (const from of t.from) {
        expect(JOURNEY_STAGES).toContain(from);
      }
    }
  });

  it('every transition declares a capability and a feature flag', () => {
    for (const t of TRANSITIONS) {
      expect(t.requiredCapability.length).toBeGreaterThan(0);
      expect(t.requiredFeatureFlag.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate (command, from) pairs', () => {
    const seen = new Set<string>();
    for (const t of TRANSITIONS) {
      for (const from of t.from) {
        const key = `${t.command}::${from}`;
        expect(seen.has(key), `duplicate transition ${key}`).toBe(false);
        seen.add(key);
      }
    }
  });
});
