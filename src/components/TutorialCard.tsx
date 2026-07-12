import type { TutorialStepId } from '../types/game';
import { CONFIG } from '../config/gameConfig';

// Card content per step (specs/TUTORIAL.md §5 — required content, copy lives here).
// `next` is the advance-button label; null means the step advances on a game event.
const STEP_CONTENT: Record<TutorialStepId, { text: string; next: string | null }> = {
  firstLine: {
    text: 'A passenger wants to reach a triangle station. Drag from the circle station to the triangle station to carry it there.',
    next: null,
  },
  rideWait: {
    text: 'A train appeared automatically — watch it pick up your passenger and deliver them for a point.',
    next: null,
  },
  extendLine: {
    text: 'Lines can grow, too — drag from the end of your line to the new star station to extend it.',
    next: null,
  },
  extendLineCard: {
    text: 'Nice — that’s still your first line, just longer. One line, one train, however many stations you add.',
    next: 'Next',
  },
  newLine: {
    text: 'Now try something different: drag from the square station to the triangle station to start a second, independent line.',
    next: null,
  },
  newLineCard: {
    text: 'That’s a new line — it runs its own train, independent of your first, and just claimed one of your line colors. More unlock as your city grows.',
    next: 'Next',
  },
  depotPlace: {
    text: 'Every 5 weeks a Weekly Upgrade offers a new train or carriage. Here’s a new train: click the train icon at the bottom, then click your line to place it.',
    next: null,
  },
  depotCarriage: {
    text: 'Carriages add capacity to a train already running. Click the carriage icon, then click a train on the map to attach it.',
    next: null,
  },
  overflowDemo: {
    text: 'Uh oh — a crowd is building at the hexagon station…',
    next: null,
  },
  overflowCard: {
    text: 'That station is overflowing. The red ring is a countdown: if it runs out while the station is still over capacity, the game ends. This is the only way to lose.',
    next: 'Next',
  },
  rescueAct: {
    text: 'Save it! Connect the hexagon station — drag from one of your line’s ends to it, or draw a new line to it.',
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
    text: 'That’s the core loop! From here: weeks pass and new stations keep appearing, and extra lines unlock as the city grows.',
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
