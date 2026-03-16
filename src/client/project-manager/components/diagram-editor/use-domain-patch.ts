import { useEffect, useMemo, useState } from "react";

type VersionedModel = {
  readonly revision: string;
};

export type DomainPatchMergeResult<TModel> = {
  readonly model: TModel;
  readonly conflicts: readonly string[];
};

export const useDomainPatch = <TModel extends VersionedModel, TPatch>(params: {
  readonly baseModel: TModel | null;
  readonly applyPatch: (model: TModel, patch: TPatch) => TModel;
  readonly mergeIncoming: (
    incoming: TModel,
    patches: readonly TPatch[]
  ) => DomainPatchMergeResult<TModel>;
  readonly persistModel: (model: TModel) => Promise<void>;
}): {
  readonly model: TModel | null;
  readonly conflicts: readonly string[];
  readonly pendingPatchCount: number;
  readonly applyDomainPatch: (patch: TPatch) => Promise<void>;
  readonly clearConflicts: () => void;
} => {
  const [model, setModel] = useState<TModel | null>(params.baseModel);
  const [pendingPatches, setPendingPatches] = useState<readonly TPatch[]>([]);
  const [conflicts, setConflicts] = useState<readonly string[]>([]);

  useEffect(() => {
    const baseModel = params.baseModel;
    if (!baseModel) {
      setModel(null);
      setPendingPatches([]);
      setConflicts([]);
      return;
    }

    setModel((currentModel) => {
      if (!currentModel) {
        return baseModel;
      }
      if (currentModel.revision === baseModel.revision) {
        setPendingPatches([]);
        setConflicts([]);
        return baseModel;
      }
      if (pendingPatches.length === 0) {
        setConflicts([]);
        return baseModel;
      }

      const merged = params.mergeIncoming(baseModel, pendingPatches);
      setConflicts(merged.conflicts);
      void params.persistModel(merged.model);
      return merged.model;
    });
  }, [
    params.mergeIncoming,
    params.persistModel,
    params.baseModel,
    pendingPatches,
  ]);

  const applyDomainPatch = async (patch: TPatch): Promise<void> => {
    let nextModel: TModel | null = null;

    setModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }
      nextModel = params.applyPatch(currentModel, patch);
      return nextModel;
    });

    if (!nextModel) {
      return;
    }

    const materializedModel = nextModel;
    setPendingPatches((current) => [...current, patch]);
    setConflicts([]);
    await params.persistModel(materializedModel);
  };

  return useMemo(
    () => ({
      model,
      conflicts,
      pendingPatchCount: pendingPatches.length,
      applyDomainPatch,
      clearConflicts: () => {
        setConflicts([]);
      },
    }),
    [conflicts, model, pendingPatches.length]
  );
};
