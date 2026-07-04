import { GameCanvas } from './components/GameCanvas';

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#2c2c2c',
    }}>
      <GameCanvas />
    </div>
  );
}

export default App;
