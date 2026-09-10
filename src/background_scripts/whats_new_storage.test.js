import { describe, expect, it, vi } from 'vitest';
import {
  flagUpdate,
  getWhatsNewState,
  markWhatsNewSeen,
} from './whats_new_storage.js';

/** Minimal in-memory stand-in for browser.storage.local. */
function installFakeStorage(initial = {}) {
  const store = { ...initial };
  globalThis.browser = {
    storage: {
      local: {
        get: vi.fn(async (key) => ({ [key]: store[key] })),
        set: vi.fn(async (patch) => Object.assign(store, patch)),
      },
    },
  };
  return store;
}

describe('whats new state', () => {
  it('has nothing pending for a user who never updated', async () => {
    installFakeStorage();
    expect(await getWhatsNewState()).toEqual({
      pending: false,
      version: null,
      previousVersion: null,
    });
  });

  it('remembers the versions an update moved between', async () => {
    installFakeStorage();
    await flagUpdate('1.11.0', '1.10.0');

    expect(await getWhatsNewState()).toMatchObject({
      pending: true,
      version: '1.11.0',
      previousVersion: '1.10.0',
    });
  });

  it('stays dismissed once the note has been read', async () => {
    installFakeStorage();
    await flagUpdate('1.11.0', '1.10.0');
    await markWhatsNewSeen();

    const state = await getWhatsNewState();
    expect(state.pending).toBe(false);
    // The version is kept so a later release can tell what was last shown.
    expect(state.version).toBe('1.11.0');
  });
});
