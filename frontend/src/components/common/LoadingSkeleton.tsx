interface SkeletonProps {
  rows?: number;
  className?: string;
}

export default function LoadingSkeleton({ rows = 3, className = "" }: SkeletonProps) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-dark-700 rounded-lg" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-4 bg-dark-700 rounded w-1/3" />
      <div className="h-8 bg-dark-700 rounded w-1/2" />
    </div>
  );
}
