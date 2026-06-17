interface BrandBugIconProps {
  className?: string;
}

export default function BrandBugIcon({ className = "h-6 w-6" }: BrandBugIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 48"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 0h52a6 6 0 0 1 6 6v42H0V6a6 6 0 0 1 6-6Zm0 4a2 2 0 0 0-2 2v38h56V6a2 2 0 0 0-2-2H6Z"
      />
      <rect x="8" y="44" width="14" height="4" rx="1.5" />
      <rect x="25" y="44" width="14" height="4" rx="1.5" />
      <rect x="42" y="44" width="14" height="4" rx="1.5" />
      <path d="M25.2 12.8 22 9.6 24.2 7.4l4.2 4.2a14.6 14.6 0 0 1 7.2 0l4.2-4.2L42 9.6l-3.2 3.2a13.7 13.7 0 0 1 4 5.6l4.6-2.2 1.4 2.8-5.2 2.5c.2 1 .4 2 .4 3.1v.9h5.5v3H44c-.2 1.6-.6 3.1-1.2 4.5l5 2.4-1.4 2.8-5.1-2.4A12.2 12.2 0 0 1 32 40a12.2 12.2 0 0 1-9.3-4.2l-5.1 2.4-1.4-2.8 5-2.4c-.6-1.4-1-2.9-1.2-4.5h-5.5v-3H20v-.9c0-1.1.1-2.1.4-3.1L15.2 19l1.4-2.8 4.6 2.2a13.7 13.7 0 0 1 4-5.6Z" />
    </svg>
  );
}
