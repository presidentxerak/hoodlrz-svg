interface SkeletonProps {
  className?: string;
  count?: number;
}

export default function Skeleton({ className = "", count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={[
            "animate-pulse rounded-none bg-[var(--border)]",
            className,
          ].join(" ")}
        />
      ))}
    </>
  );
}
