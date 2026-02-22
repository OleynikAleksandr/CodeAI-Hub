import { type CSSProperties, useEffect, useRef, useState } from "react";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const ROTATE_DEGREE_PER_DIGIT = 36;

const computeForwardDigitSteps = (from: number, to: number): number => {
  if (to === from) {
    return 0;
  }
  if (to > from) {
    return to - from;
  }
  return 10 - from + to;
};

const FlipDigit = ({
  digit,
  heightPx,
}: {
  readonly digit: number;
  readonly heightPx: number;
}) => {
  const prevDigitRef = useRef(digit);
  const [rotationDeg, setRotationDeg] = useState(
    () => -digit * ROTATE_DEGREE_PER_DIGIT
  );
  const translateZ = Math.max(1, Math.round(heightPx * 0.95));

  useEffect(() => {
    const previous = prevDigitRef.current;
    if (digit === previous) {
      return;
    }

    const steps = computeForwardDigitSteps(previous, digit);
    prevDigitRef.current = digit;
    if (steps === 0) {
      return;
    }
    setRotationDeg((current) => current - steps * ROTATE_DEGREE_PER_DIGIT);
  }, [digit]);

  return (
    <span
      aria-hidden="true"
      className="task-timer__digit"
      style={
        {
          "--task-timer-digit-height": `${heightPx}px`,
          "--task-timer-translate-z": `${translateZ}px`,
        } as CSSProperties
      }
    >
      <span
        className="task-timer__wheel"
        style={{ transform: `rotateX(${rotationDeg}deg)` }}
      >
        {DIGITS.map((value, index) => (
          <span
            className="task-timer__face"
            key={value}
            style={{
              transform: `rotateX(${ROTATE_DEGREE_PER_DIGIT * index}deg) translateZ(${translateZ}px)`,
              opacity: value === digit ? 1 : 0.82,
            }}
          >
            {value}
          </span>
        ))}
      </span>
    </span>
  );
};

export const FlipClock = ({
  value,
  digitHeightPx,
  active,
}: {
  readonly value: string;
  readonly digitHeightPx: number;
  readonly active: boolean;
}) => {
  const chars = Array.from(value);
  const className = active
    ? "task-timer__clock task-timer__clock--active"
    : "task-timer__clock";

  return (
    <span aria-hidden="true" className={className}>
      {chars.map((char, index) => {
        const digit = Number.parseInt(char, 10);
        if (Number.isNaN(digit)) {
          return (
            <span
              className="task-timer__sep"
              key={`${char}:${index.toString()}`}
            >
              {char}
            </span>
          );
        }
        return (
          <FlipDigit
            digit={digit}
            heightPx={digitHeightPx}
            key={`d:${index.toString()}`}
          />
        );
      })}
    </span>
  );
};
