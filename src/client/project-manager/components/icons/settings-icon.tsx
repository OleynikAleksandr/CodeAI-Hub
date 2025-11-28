import type React from "react";

interface SettingsIconProps {
  className?: string;
  size?: number;
}

/**
 * Settings gear icon
 */
export const SettingsIcon: React.FC<SettingsIconProps> = ({
  className = "pm-icon",
  size = 16,
}) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 16 16"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 10a2 2 0 100-4 2 2 0 000 4z"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path
      d="M13.5 8c0-.32-.03-.63-.08-.93l1.58-1.22-1.5-2.6-1.87.75a5.5 5.5 0 00-1.6-.93L9.5.5h-3l-.53 2.07c-.58.2-1.12.52-1.6.93l-1.87-.75-1.5 2.6 1.58 1.22c-.1.6-.1 1.26 0 1.86l-1.58 1.22 1.5 2.6 1.87-.75c.48.41 1.02.73 1.6.93l.53 2.07h3l.53-2.07c.58-.2 1.12-.52 1.6-.93l1.87.75 1.5-2.6-1.58-1.22c.05-.3.08-.61.08-.93z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.2"
    />
  </svg>
);
