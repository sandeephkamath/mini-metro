import type { TutorialStepId } from '../types/game';
import { CONFIG } from '../config/gameConfig';

// Card content per step (specs/TUTORIAL.md §5 — required content, copy lives here).
// `next` is the advance-button label; null means the step advances on a game event.
const STEP_CONTENT: Record<TutorialStepId, { text: string; next: string | null }> = {
  welcome: {
    text: 'Welcome! Passengers appear at stations, and each wants to reach a station shaped like the icon they carry. You build the metro that gets them there.',
    next: 'Next',
  },
  firstLine: {
    text: 'Draw your first line: press on the circle station and drag to the triangle station.',
    next: null,
  },
  train: {
    text: 'A train appeared automatically. It shuttles back and forth along your line, stopping at every station.',
    next: 'Next',
  },
  passenger: {
    text: 'A passenger just arrived at the circle station. The small shape is their destination — this one wants a triangle station. Passengers wait in a queue until a train that can take them arrives.',
    next: 'Next',
  },
  boardingWait: {
    text: 'Watch — the train will pick them up when it stops at their station.',
    next: null,
  },
  boardingCard: {
    text: 'On board! Passengers only board a train that can actually carry them toward their destination.',
    next: 'Next',
  },
  deliveryWait: {
    text: 'Now watch them ride to the triangle station.',
    next: null,
  },
  deliveryCard: {
    text: 'Delivered! Every delivered passenger scores one point — the score at the top right just went up.',
    next: 'Next',
  },
  overflowDemo: {
    text: 'Uh oh — a crowd is building at the square station…',
    next: null,
  },
  overflowCard: {
    text: 'That station is overflowing. The red ring is a countdown: if it runs out while the station is still over capacity, the game ends. This is the only way to lose.',
    next: 'Next',
  },
  rescueAct: {
    text: 'Save it! Connect the square station — drag from one of your line’s ends to the square station, or draw a new line to it.',
    next: null,
  },
  rescueWait: {
    text: 'Help is on the way — the train will pick up the crowd.',
    next: null,
  },
  averted: {
    text: 'Crisis averted. The ring vanishes the moment a station drops back below capacity. Keep every station connected and flowing.',
    next: 'Next',
  },
  wrapup: {
    text: 'That’s the core loop! From here: weeks pass and new stations keep appearing, every 5 weeks a Weekly Upgrade offers a new train, carriage or more time, extra lines unlock as the city grows — and the pause / fast-forward buttons are always there when things get busy.',
    next: 'Done',
  },
};

interface TutorialCardProps {
  step: TutorialStepId;
  onNext: () => void;
  onSkip: () => void;
}

export function TutorialCard({ step, onNext, onSkip }: TutorialCardProps) {
  const { text, next } = STEP_CONTENT[step];

  return (
    <div
      data-testid="tutorial-card"
      style={{
        position: 'absolute',
        bottom: 56, // clear of the HUD's bottom bar
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 420,
        width: 'calc(100% - 40px)',
        background: 'rgba(20, 24, 30, 0.92)',
        color: '#fdf6ec',
        fontFamily: 'monospace',
        fontSize: '13px',
        lineHeight: 1.5,
        padding: '12px 16px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.15)',
        zIndex: 20,
        pointerEvents: 'auto',
      }}
    >
      <div>{text}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        <button
          data-testid="tutorial-skip"
          onClick={onSkip}
          style={{
            background: 'transparent',
            color: '#999',
            border: 'none',
            fontFamily: 'monospace',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Skip tutorial
        </button>
        {next && (
          <button
            data-testid="tutorial-next"
            onClick={onNext}
            style={{
              background: CONFIG.UI_PRIMARY_COLOR,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '5px 18px',
            }}
          >
            {next}
          </button>
        )}
      </div>
    </div>
  );
}
