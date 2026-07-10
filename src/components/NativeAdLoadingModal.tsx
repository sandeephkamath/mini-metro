// Shown only for the brief gap between accepting a real AdMob offer and the native
// rewarded ad's own full-screen UI taking over (themes/metro.md §4.2) — unlike
// SimulatedAdModal, there's no known fixed duration to show progress against.
export function NativeAdLoadingModal() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)',
      zIndex: 30,
    }}>
      <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'monospace' }}>
        <div style={{ fontSize: 16 }}>Loading ad…</div>
      </div>
    </div>
  );
}
