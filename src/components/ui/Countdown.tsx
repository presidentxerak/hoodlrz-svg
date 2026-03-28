"use client";

import { useEffect, useState, useCallback } from "react";

interface CountdownProps {
  targetDate: string | Date;
  label?: string;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Segment({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-hoodlrz text-4xl font-bold leading-none tracking-tight text-foreground sm:text-5xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-muted">
        {label}
      </span>
    </div>
  );
}

export default function Countdown({
  targetDate,
  label,
  onComplete,
}: CountdownProps) {
  const target = new Date(targetDate);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calcTimeLeft(target)
  );

  const isComplete = useCallback(
    (tl: TimeLeft) =>
      tl.days === 0 && tl.hours === 0 && tl.minutes === 0 && tl.seconds === 0,
    []
  );

  useEffect(() => {
    const id = setInterval(() => {
      const next = calcTimeLeft(target);
      setTimeLeft(next);
      if (isComplete(next)) {
        clearInterval(id);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);

  return (
    <div className="flex flex-col items-center gap-3">
      {label && (
        <span className="text-xs uppercase tracking-widest text-muted">
          {label}
        </span>
      )}
      <div className="grid grid-cols-4 gap-4 sm:gap-6">
        <Segment value={timeLeft.days} label="Days" />
        <Segment value={timeLeft.hours} label="Hrs" />
        <Segment value={timeLeft.minutes} label="Min" />
        <Segment value={timeLeft.seconds} label="Sec" />
      </div>
    </div>
  );
}
