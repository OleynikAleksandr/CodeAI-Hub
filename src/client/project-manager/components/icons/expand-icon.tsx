import type React from "react";

interface ExpandIconProps {
	className?: string;
	size?: number;
}

/**
 * Expand sidebar icon (wall + right arrow)
 * Shows vertical wall with arrow pointing right
 */
export const ExpandIcon: React.FC<ExpandIconProps> = ({
	className = "pm-icon",
	size = 16,
}) => (
	<svg
		className={className}
		width={size}
		height={size}
		viewBox="0 0 16 16"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			d="M3 2v12"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
		/>
		<path
			d="M6 8h6M12 8l-3-3M12 8l-3 3"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);
