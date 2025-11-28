import type React from "react";

interface CollapseIconProps {
	className?: string;
	size?: number;
}

/**
 * Collapse sidebar icon (wall + left arrow)
 * Shows vertical wall with arrow pointing left
 */
export const CollapseIcon: React.FC<CollapseIconProps> = ({
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
			d="M12 8H6M6 8l3-3M6 8l3 3"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);
