import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type NpmCommandResult = {
	readonly stdout: string;
	readonly stderr: string;
};

export async function runNpmCommand(
	args: readonly string[],
	options: {
		readonly npmExecutable: string;
		readonly env: NodeJS.ProcessEnv;
	},
): Promise<NpmCommandResult> {
	const result = await execFileAsync(options.npmExecutable, [...args], {
		env: options.env,
		windowsHide: true,
	});
	return {
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}
