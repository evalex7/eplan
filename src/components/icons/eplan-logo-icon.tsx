import { cn } from '@/lib/utils';

export function EplanLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 100 100"
      className={cn('w-6 h-6', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width="30" height="30" fill="#f56565" />
      <rect x="35" y="0" width="30" height="30" fill="#68d391" />
      <rect x="70" y="0" width="30" height="30" fill="#4299e1" />
      <rect x="0" y="35" width="30" height="30" fill="#f6e05e" />
      <rect x="35" y="35" width="30" height="30" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="70" y="35" width="30" height="30" fill="#ed8936" />
      <rect x="0" y="70" width="30" height="30" fill="#b794f4" />
      <rect x="35" y="70" width="30" height="30" fill="#f687b3" />
      <rect x="70" y="70" width="30" height="30" fill="#4fd1c5" />
    </svg>
  );
}
