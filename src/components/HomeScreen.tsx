interface HomeScreenProps {
  onPlay: () => void;
}

export function HomeScreen({ onPlay }: HomeScreenProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(245, 240, 232, 0.92)',
      zIndex: 20,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '40px 48px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        textAlign: 'center',
        maxWidth: 380,
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '2rem', fontFamily: 'monospace' }}>Mini Metro</h1>
        <p style={{ color: '#666', marginBottom: 28 }}>Connect the stations. Keep the city moving.</p>
        <button
          onClick={onPlay}
          style={{
            background: '#e74c3c',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 32px',
            fontSize: '16px',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          Play
        </button>
      </div>
    </div>
  );
}
