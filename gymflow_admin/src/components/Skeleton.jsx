import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-dark-800 rounded-xl p-6 animate-pulse">
      <div className="h-4 bg-dark-600 rounded w-1/3 mb-4"></div>
      <div className="h-8 bg-dark-600 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-dark-600 rounded w-2/3"></div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-dark-800 rounded-xl p-6 animate-pulse">
      <div className="h-4 bg-dark-600 rounded w-1/4 mb-4"></div>
      <div className="h-48 bg-dark-600 rounded"></div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-dark-800 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-dark-600 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-dark-600 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export default function Skeleton({ type = 'card' }) {
  switch (type) {
    case 'chart': return <SkeletonChart />;
    case 'list': return <SkeletonList />;
    default: return <SkeletonCard />;
  }
}
