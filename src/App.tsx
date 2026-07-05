import { GameCanvas } from './components/GameCanvas';

function App() {
  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      minHeight: '100vh', // fallback for browsers without dvh support
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#2c2c2c',
      overflow: 'hidden', // the game stage scales itself to fit; nothing here should ever need to scroll
    }}>
      <GameCanvas />
    </div>
  );
}

export default App;
