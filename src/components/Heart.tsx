export function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M32 57S6 41.5 6 22.5C6 13.4 13.2 7 21.2 7c4.9 0 8.6 2.4 10.8 6.1C34.2 9.4 37.9 7 42.8 7 50.8 7 58 13.4 58 22.5 58 41.5 32 57 32 57z"
      />
    </svg>
  );
}
