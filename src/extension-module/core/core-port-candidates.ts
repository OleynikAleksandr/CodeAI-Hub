import { readPreferredCorePort } from "../runtime/runtime-registry";

export const resolvePreferredCorePort = async (
	envPort: number,
	requestedPort?: number,
): Promise<number> => {
	if (Number.isFinite(requestedPort) && Number(requestedPort) > 0) {
		return Number(requestedPort);
	}
	const stored = await readPreferredCorePort();
	if (typeof stored === "number" && stored > 0) {
		return stored;
	}
	return envPort;
};
