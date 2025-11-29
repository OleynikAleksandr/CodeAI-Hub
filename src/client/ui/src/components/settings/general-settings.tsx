import type { CSSProperties } from "react";
import { memo } from "react";
import { postVsCodeMessage } from "../../vscode";
import SettingsCard from "./settings-card";

const wrapperStyles: CSSProperties = {
	marginBottom: "30px",
};

const descriptionStyles: CSSProperties = {
	fontSize: "13px",
	color: "#bbbbbb",
	lineHeight: 1.4,
	margin: 0,
};

const buttonStyles: CSSProperties = {
	alignSelf: "flex-start",
	border: "1px solid #3a3d41",
	background: "#0e639c",
	color: "#ffffff",
	padding: "8px 16px",
	borderRadius: "4px",
	cursor: "pointer",
	fontSize: "12px",
};

const GeneralSettings = () => {
	const handleRestartCore = () => {
		postVsCodeMessage({ type: "core:restart-request" });
	};

	return (
		<div style={wrapperStyles}>
			<SettingsCard title="Core Controls">
				<p style={descriptionStyles}>
					Restart the CodeAI Hub core to trigger a fresh CLI detection cycle.
					Use this option after resolving CLI authentication or quota issues.
				</p>
				<button onClick={handleRestartCore} style={buttonStyles} type="button">
					Restart Core
				</button>
			</SettingsCard>
		</div>
	);
};

export default memo(GeneralSettings);
