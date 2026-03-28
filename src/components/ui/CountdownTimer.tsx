"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  targetDate: string | Date;
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
    <div className="flex flex-col items-center">
      <span className="font-hoodlrz text-2xl font-bold leading-none tracking-tight text-foreground sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-muted">
        {label}
      </span>
    </div>
  );
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calcTimeLeft(new Date(targetDate))
  );

  useEffect(() => {
    const target = new Date(targetDate);
    const id = setInterval(() => {
      setTimeLeft(calcTimeLeft(target));
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Segment value={timeLeft.days} label="Days" />
      <span className="text-muted text-lg font-light">:</span>
      <Segment value={timeLeft.hours} label="Hrs" />
      <span className="text-muted text-lg font-light">:</span>
      <Segment value={timeLeft.minutes} label="Min" />
      <span className="text-muted text-lg font-light">:</span>
      <Segment value={timeLeft.seconds} label="Sec" />
    </div>
  );
}
