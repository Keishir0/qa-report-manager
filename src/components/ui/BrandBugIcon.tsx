interface BrandBugIconProps {
  className?: string;
}

export default function BrandBugIcon({ className = "h-6 w-6" }: BrandBugIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M22.5 16.7 17.4 11.6l3.5-3.5 6.5 6.5a23 23 0 0 1 9.2 0l6.5-6.5 3.5 3.5-5.1 5.1a22 22 0 0 1 5.8 8.6l7.3-3.5 2.3 4.6-8.4 4c.3 1.4.4 2.9.4 4.4v1.4H59v5H48.8a21.2 21.2 0 0 1-2.1 7.2l8 3.8-2.3 4.6-8-3.8A19.2 19.2 0 0 1 32 59a19.2 19.2 0 0 1-12.4-6l-8 3.8-2.3-4.6 8-3.8a21.2 21.2 0 0 1-2.1-7.2H5v-5h9.5v-1.4c0-1.5.1-3 .4-4.4l-8.4-4 2.3-4.6 7.3 3.5a22 22 0 0 1 5.8-8.6Z" />
    </svg>
  );
}
