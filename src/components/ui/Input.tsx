"use client";

import type { ChangeEventHandler } from "react";

interface InputProps {
  label?: string;
  error?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  name?: string;
}

export default function Input({
  label,
  error,
  type = "text",
  placeholder,
  value,
  onChange,
  name,
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={name}
          className="text-xs uppercase tracking-widest text-muted"
        >
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={[
          "w-full rounded-none border bg-transparent px-4 py-2.5 text-sm text-foreground",
          "placeholder:text-muted/60",
          "outline-none transition-colors duration-150",
          "focus:border-accent-red focus:ring-0",
          error
            ? "border-accent-red"
            : "border-[var(--border)]",
        ].join(" ")}
      />
      {error && (
        <span className="text-xs text-accent-red">{error}</span>
      )}
    </div>
  );
}
