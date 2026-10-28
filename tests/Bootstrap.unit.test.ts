import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const sdk = vi.hoisted(() => ({
  app: {}, auth: { currentUser: null }, db: {}, apps: vi.fn(() => [] as any[]),
  initialize: vi.fn(() => ({})), persistence: vi.fn(), popup: vi.fn(),
  connectAuth: vi.fn(), connectStore: vi.fn(), observe: vi.fn(() => () => {}),
}));
vi.mock('firebase/app', () => ({ initializeApp: sdk.initialize, getApps: sdk.apps }));
vi.mock('firebase/auth', () => ({
  getAuth: () => sdk.auth, GoogleAuthProvider: class {}, browserSessionPersistence: {},
  setPersistence: sdk.persistence, connectAuthEmulator: sdk.connectAuth,
  signInWithPopup: sdk.popup, signOut: vi.fn(), onAuthStateChanged: sdk.observe,
}));
vi.mock('firebase/firestore', () => ({ getFirestore: () => sdk.db, connectFirestoreEmulator: sdk.connectStore }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); sdk.apps.mockReturnValue([]); vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'true'); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('Fail-closed bootstrap', () => {
  it('rejects a production build without explicit emulator configuration before SDK initialization', async () => {
    vi.stubEnv('MODE', 'production'); vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'false');
    const { initFirebase } = await import('../src/wrapper/config/firebase');
    await expect(initFirebase()).rejects.toThrow();
    expect(sdk.initialize).not.toHaveBeenCalled();
  });
  it('connects both SDKs then waits for persistence before exposing adapters; popup starts synchronously', async () => {
    let release!: () => void;
    sdk.persistence.mockImplementation(() => new Promise<void>(r => { release = r; }));
    const { initFirebase } = await import('../src/wrapper/config/firebase');
    const { FirebaseAuthAdapter } = await import('../src/wrapper/adapters/FirebaseAuthAdapter');
    let ready = false;
    const boot = initFirebase().then(services => {
      ready = true;
      const adapter = new FirebaseAuthAdapter(services.auth, services.googleProvider);
      adapter.onAuthStateChanged(() => {});
      return adapter;
    });
    expect(sdk.connectAuth).toHaveBeenCalledOnce(); expect(sdk.connectStore).toHaveBeenCalledOnce();
    expect(ready).toBe(false); expect(sdk.observe).not.toHaveBeenCalled();
    release(); const adapter = await boot;
    expect(sdk.observe).toHaveBeenCalledOnce();
    sdk.popup.mockResolvedValue({ user: { uid: 'alice', providerData: [{ providerId: 'google.com' }] } });
    const login = adapter.signInWithGoogle(); expect(sdk.popup).toHaveBeenCalledOnce(); await login;
  });
  it('does not publish SDK capabilities when persistence fails', async () => {
    sdk.persistence.mockRejectedValue(new Error('private SDK details'));
    const { initFirebase } = await import('../src/wrapper/config/firebase');
    await expect(initFirebase()).rejects.toThrow();
    expect(sdk.observe).not.toHaveBeenCalled(); expect(sdk.popup).not.toHaveBeenCalled();
  });
  it('rejects external emulator endpoints and unrelated preexisting apps', async () => {
    vi.stubEnv('VITE_FIREBASE_AUTH_EMULATOR_HOST', 'example.com:9099');
    let module = await import('../src/wrapper/config/firebase');
    await expect(module.initFirebase()).rejects.toThrow(); expect(sdk.initialize).not.toHaveBeenCalled();
    vi.resetModules(); vi.stubEnv('VITE_FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099'); sdk.apps.mockReturnValue([{}]);
    module = await import('../src/wrapper/config/firebase');
    await expect(module.initFirebase()).rejects.toThrow(); expect(sdk.initialize).not.toHaveBeenCalled();
  });
});
