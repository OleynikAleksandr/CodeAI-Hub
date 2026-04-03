import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DescriptionQuestionnaireService } from "../../services/description-questionnaire-service";
import { DescriptionSubmitService } from "../../services/description-submit-service";
import type { ProviderStackDescriptor, ProviderStackId } from "../../../../types/provider";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { DescriptionQuestionnaireView } from "../../../ui/src/components/description-questionnaire/description-questionnaire-view";
import { api } from "../../api";
import { toWorkflowWorkspaceSlug } from "../../services/workflow-state-client";
import { DescriptionProviderPicker } from "./description-provider-picker";

const SAVE_DEBOUNCE_MS = 400;
const USER_ARTIFACTS_CATEGORY = "interactive_templates";
const QUESTION_HEADER_BLOCK_REGEX =
  /##\s+.*\n(?:<small><i>[\s\S]*?<\/i><\/small>\n\n)?(<!--\s*field:([^\s]+)\s*-->)/g;

type QuestionnaireQuestionPresentation = {
  readonly description?: string; readonly hint?: string; readonly id: string; readonly title: string; readonly titleHint?: string;
};

type QuestionnaireFieldTranslation = {
  readonly titleFallback: string; readonly titleHintFallback: string; readonly titleHintKey: string; readonly titleKey: string;
};

const createQuestionnaireFieldTranslation = (
  messageId: string,
  titleFallback: string,
  titleHintFallback: string
): QuestionnaireFieldTranslation => ({ titleFallback, titleHintFallback, titleHintKey: `pm.description.questionnaire.field.${messageId}.title_hint`, titleKey: `pm.description.questionnaire.field.${messageId}.title` });

const QUESTIONNAIRE_FIELD_TRANSLATIONS = {
  "boundaries_draft": createQuestionnaireFieldTranslation(
    "boundaries_draft",
    "9. Which Boundaries or Independent Parts Are Already Clear (optional)",
    'Are there any parts of the system that you already consider separate and independent? Example: "A separate client and a separate server", "A separate plugin and a separate synchronization service", "A separate shell and a separate core runtime", "A separate admin panel". This helps avoid mixing everything into one unclear structure later. If it is too early, leave it empty.'
  ),
  "constraints": createQuestionnaireFieldTranslation(
    "constraints",
    "10. Important Constraints",
    'Are there any constraints or special conditions to keep in mind? Example: "Must work without internet access", "Budget is limited, so no paid services", "Data must not leave the local machine", "Support for Russian and English is required". If there is nothing special, leave it empty.'
  ),
  "key_functions": createQuestionnaireFieldTranslation(
    "key_functions",
    "7. What the Product Must Be Able to Do",
    'List the core capabilities, the things without which the product does not make sense. You do not need to describe everything, only the most important parts. The rest can appear in later stages. Example: "add and edit expenses; show statistics by category; warn about budget overruns; export data to PDF."'
  ),
  "meta.title": createQuestionnaireFieldTranslation(
    "meta_title",
    "1. Project Name",
    "What is the name of your project? Use a short, clear title."
  ),
  "modules_draft": createQuestionnaireFieldTranslation(
    "modules_draft",
    "8. Which Large Parts the Product May Have (optional)",
    'If you already have an idea of the major parts of the system, list them with a short explanation. You do not need classes or low-level technical details here. What matters are the large understandable blocks from which the architecture and diagram can later be built. You can write things like "The surface through which the user enters the system", "A separate runtime", "A separate service", "Integration with an external API", "A background worker". If you do not know yet, leave it empty and the agent will help define the structure later.'
  ),
  "notes": createQuestionnaireFieldTranslation(
    "notes",
    "12. Notes",
    "Any additional details that will help explain the future product."
  ),
  "out_of_scope": createQuestionnaireFieldTranslation(
    "out_of_scope",
    "11. What We Definitely Do Not Build",
    'What is outside this project? This helps keep the scope focused and prevents it from spreading. Example: "We do not build a mobile version", "We do not integrate with banks", "We do not add multi-user mode".'
  ),
  "pre_read_documents": createQuestionnaireFieldTranslation(
    "pre_read_documents",
    "0. Reference Documents (if any)",
    "If you already have drafts, notes, specs, or links to similar applications, list them here with file paths or links and a short explanation. If the project starts from scratch, leave this empty."
  ),
  "problem_and_goals": createQuestionnaireFieldTranslation(
    "problem_and_goals",
    "4. Problem and Goal",
    'Which problem do you want to solve with this product? What do you want to achieve? Example problem: "I currently track expenses in Excel, which is inconvenient, data gets lost, and there is no clear overview." Example goal: "I want to see all expenses by category for any period and receive a warning when a category budget is exceeded."'
  ),
  "project.stack": createQuestionnaireFieldTranslation(
    "project_stack",
    "2. Product Type / Platform",
    'What kind of product is this? Example: "Web application", "Desktop app", "Mobile application", "VS Code extension", "CLI tool", "Backend service", "I do not know yet". This is a simple question, but it strongly affects the architecture that follows.'
  ),
  "short_description": createQuestionnaireFieldTranslation(
    "short_description",
    "3. What the Project Is About",
    'Use 1-3 sentences to explain what the product is and why it is needed. Example: "An application for tracking personal finances. It helps users see where their money goes and plan a budget."'
  ),
  "user_scenarios": createQuestionnaireFieldTranslation(
    "user_scenarios",
    "6. How the Product Should Work",
    `Describe the main usage situations: what you or the user does in the product and what result should happen in response. Include as many scenarios as needed to make the product behavior clear. Write in simple language, as if you were explaining it to a friend. Example: "I open the application and see a monthly expense summary. I click 'Add expense', choose a category, and enter an amount. If the food budget is exceeded, I see a red warning."`
  ),
  "users": createQuestionnaireFieldTranslation(
    "users",
    "5. Who Will Use the Product",
    'Who are the main users? Example: "Only me", "A team of 5 people", "Any internet user", "Small business accountants".'
  ),
} as const satisfies Readonly<Record<string, QuestionnaireFieldTranslation>>;

const resolveQuestionnaireFieldTranslation = (
  fieldId: string
): QuestionnaireFieldTranslation | undefined =>
  Object.prototype.hasOwnProperty.call(
    QUESTIONNAIRE_FIELD_TRANSLATIONS,
    fieldId
  )
    ? QUESTIONNAIRE_FIELD_TRANSLATIONS[
        fieldId as keyof typeof QUESTIONNAIRE_FIELD_TRANSLATIONS
      ]
    : undefined;

const localizeQuestionnaireQuestions = (
  questions: readonly QuestionnaireQuestionPresentation[],
  t: ReturnType<typeof useLocalization>["t"]
): readonly QuestionnaireQuestionPresentation[] =>
  questions.map((question) => {
    const translation = resolveQuestionnaireFieldTranslation(question.id);
    if (!translation) return question;
    const localizedTitleHint = t(USER_ARTIFACTS_CATEGORY, translation.titleHintKey, translation.titleHintFallback);
    return { ...question, title: t(USER_ARTIFACTS_CATEGORY, translation.titleKey, translation.titleFallback), titleHint: localizedTitleHint.trim().length > 0 ? localizedTitleHint : undefined };
  });

const localizeQuestionnaireTemplate = (
  template: string,
  questions: readonly QuestionnaireQuestionPresentation[]
): string => {
  const questionsById = new Map(questions.map((question) => [question.id, question]));

  return template.replace(
    QUESTION_HEADER_BLOCK_REGEX,
    (match, fieldMarker: string, fieldId: string) => {
      const question = questionsById.get(fieldId);
      if (!question) return match;

      const headerBodyLines: string[] = [];
      if (question.titleHint) headerBodyLines.push(`<small><i>${question.titleHint}</i></small>`);
      if (question.description) headerBodyLines.push(question.description);
      if (question.hint) headerBodyLines.push(question.hint);
      const headerBody = headerBodyLines.length > 0 ? `${headerBodyLines.join("\n")}\n\n` : "\n";

      return `## ${question.title}\n${headerBody}${fieldMarker}`;
    }
  );
};

interface DescriptionQuestionnairePanelProps {
  readonly workspaceName?: string;
  readonly workspacePath?: string;
  readonly workspaceSlug?: string;
  readonly onClose?: () => void;
  readonly onDescriptionSessionCreated?: (sessionId: string) => void;
  readonly onDescriptionSessionCreatePendingChange?: (
    payload: { readonly providerTitle: string } | null
  ) => void;
}

type PanelState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | {
      readonly status: "ready";
      readonly sessionId: string;
      readonly questionnairePath: string;
      readonly template: string;
      readonly placeholders: Record<string, string>;
      readonly questions: readonly {
        id: string;
        title: string;
        titleHint?: string;
        description?: string;
        hint?: string;
      }[];
    };

export const DescriptionQuestionnairePanel: React.FC<
  DescriptionQuestionnairePanelProps
> = ({
  workspaceName,
  workspacePath,
  workspaceSlug,
  onClose,
  onDescriptionSessionCreated,
  onDescriptionSessionCreatePendingChange,
}) => {
  const { t } = useLocalization();
  const serviceRef = useRef(new DescriptionQuestionnaireService());
  const descriptionSubmitRef = useRef(new DescriptionSubmitService());
  const [panelState, setPanelState] = useState<PanelState>({ status: "idle" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [providerOptions, setProviderOptions] = useState<
    readonly ProviderStackDescriptor[]
  >([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const submitInFlightRef = useRef(false);

  const resolvedWorkspaceName =
    workspaceName && workspaceName.trim().length > 0
      ? workspaceName.trim()
      : "Workspace";

  const resolvedWorkspaceSlug =
    typeof workspaceSlug === "string" && workspaceSlug.trim().length > 0
      ? workspaceSlug.trim()
      : toWorkflowWorkspaceSlug(resolvedWorkspaceName);

  const canLoad =
    typeof workspacePath === "string" && workspacePath.trim().length > 0;
  useEffect(() => {
    if (!canLoad) {
      setPanelState({ status: "idle" });
      return;
    }

    const service = serviceRef.current;
    let cancelled = false;

    setAnswers({});
    setSubmitError(null);
    setProviderPickerOpen(false);
    // Preserve pending state during re-mount if submit is still in-flight
    if (!submitInFlightRef.current) {
      onDescriptionSessionCreatePendingChange?.(null);
    }
    setPanelState({ status: "loading" });
    service
      .load({
        name: resolvedWorkspaceName,
        path: workspacePath,
        slug: resolvedWorkspaceSlug,
      })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.status !== "ok") {
          setPanelState({ status: "error" });
          return;
        }
        setPanelState({
          status: "ready",
          sessionId: result.value.sessionId,
          questionnairePath: result.value.path,
          template: result.value.template,
          placeholders: result.value.placeholders,
          questions: result.value.questions,
        });
        setAnswers(result.value.answers);
      })
      .catch(() => {
        if (!cancelled) {
          setPanelState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    canLoad,
    onDescriptionSessionCreatePendingChange,
    resolvedWorkspaceName,
    resolvedWorkspaceSlug,
    workspacePath,
  ]);

  const title = useMemo(
    () =>
      t(
        USER_ARTIFACTS_CATEGORY,
        "pm.description.questionnaire.title_template",
        "Description questionnaire — {workspace}",
        { workspace: resolvedWorkspaceName }
      ),
    [resolvedWorkspaceName, t]
  );

  const resolvedPanelState = useMemo<PanelState>(() => {
    if (panelState.status !== "ready") return panelState;
    const localizedQuestions = localizeQuestionnaireQuestions(panelState.questions, t);
    return { ...panelState, questions: localizedQuestions, template: localizeQuestionnaireTemplate(panelState.template, localizedQuestions) };
  }, [panelState, t]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  useEffect(() => {
    if (resolvedPanelState.status !== "ready") {
      return;
    }
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    const timer = window.setTimeout(() => {
      serviceRef.current
        .save(
          resolvedPanelState.sessionId,
          resolvedPanelState.questionnairePath,
          resolvedPanelState.template,
          resolvedPanelState.placeholders,
          answers
        )
        .catch(() => {
          /* ignore save errors */
        });
    }, SAVE_DEBOUNCE_MS);
    saveTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
    };
  }, [answers, resolvedPanelState]);

  const submitQuestionnaire = async (providerId: ProviderStackId) => {
    if (resolvedPanelState.status !== "ready" || submitInFlightRef.current) {
      return;
    }
    submitInFlightRef.current = true;
    setSubmitError(null);
    const providerTitle =
      providerOptions.find((provider) => provider.id === providerId)?.title ??
      null;
    onDescriptionSessionCreatePendingChange?.({
      providerTitle: providerTitle ?? providerId,
    });
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      await serviceRef.current.save(
        resolvedPanelState.sessionId,
        resolvedPanelState.questionnairePath,
        resolvedPanelState.template,
        resolvedPanelState.placeholders,
        answers
      );
      const sessionId = await descriptionSubmitRef.current.submitQuestionnaire({
        workspaceName: resolvedWorkspaceName,
        workspaceSlug: resolvedWorkspaceSlug,
        workspacePath: workspacePath ?? "",
        questionnairePath: resolvedPanelState.questionnairePath,
        stage: "description",
        providerId,
        onSessionCreated: onDescriptionSessionCreated,
      });
      if (workspacePath) {
        window.dispatchEvent(
          new CustomEvent("pm:artifact:selected", {
            detail: {
              label: "questionnaire.md",
              path: resolvedPanelState.questionnairePath,
              workspacePath,
              workspaceSlug: resolvedWorkspaceSlug,
            },
          })
        );
        // Switch session panel to dialog mode so it connects to the
        // newly created session immediately, same as a tree-node click.
        window.dispatchEvent(
          new CustomEvent("pm:dialog:open", {
            detail: {
              providerId,
              providerSessionId: null,
              workspacePath,
              workspaceSlug: resolvedWorkspaceSlug,
              initiativeSlug: resolvedWorkspaceSlug,
              stage: "description",
              sessionKind: null,
              runSlug: null,
            },
          })
        );
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : t(
              USER_ARTIFACTS_CATEGORY,
              "pm.description.questionnaire.submit_error_default",
              "Failed to submit the questionnaire."
            )
      );
      onDescriptionSessionCreatePendingChange?.(null);
    } finally {
      submitInFlightRef.current = false;
    }
  };

  const handleSubmit = () => {
    if (resolvedPanelState.status !== "ready" || submitInFlightRef.current) {
      return;
    }
    setSubmitError(null);
    setProviderOptions(api.getDescriptionProviders());
    setProviderPickerOpen(true);
  };

  const handleProviderConfirm = (providerId: ProviderStackId) => {
    setProviderPickerOpen(false);
    void submitQuestionnaire(providerId);
  };

  const handleProviderCancel = () => setProviderPickerOpen(false);
  const handleCancel = () => onClose?.();

  if (!canLoad) {
    return (
      <div className="pm-placeholder">
        {t(
          USER_ARTIFACTS_CATEGORY,
          "pm.description.questionnaire.workspace_required",
          "Select a workspace to start."
        )}
      </div>
    );
  }
  if (panelState.status === "loading") {
    return (
      <div className="pm-placeholder">
        {t(
          USER_ARTIFACTS_CATEGORY,
          "pm.description.questionnaire.loading",
          "Loading description questionnaire..."
        )}
      </div>
    );
  }
  if (panelState.status === "error") {
    return (
      <div className="pm-placeholder">
        {t(
          USER_ARTIFACTS_CATEGORY,
          "pm.description.questionnaire.load_error",
          "Failed to load the description questionnaire."
        )}
      </div>
    );
  }
  if (resolvedPanelState.status !== "ready") {
    return null;
  }
  return (
    <div className="pm-questionnaire-wrapper">
      {submitError ? (
        <div className="pm-questionnaire-alert">{submitError}</div>
      ) : null}
      <DescriptionQuestionnaireView
        answers={answers}
        cancelLabel={t(
          USER_ARTIFACTS_CATEGORY,
          "pm.description.questionnaire.cancel_label",
          "Close"
        )}
        description={t(
          USER_ARTIFACTS_CATEGORY,
          "pm.description.questionnaire.description",
          'The questionnaire is saved automatically. Click "Submit questionnaire", choose a provider, and wait for Description to start. You can continue the dialog in the same session until the final version is ready. The resulting document is saved to `.codeai-hub/<workspace>/description/Final_Description.md`.'
        )}
        onAnswerChange={handleAnswerChange}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        questions={resolvedPanelState.questions}
        submitLabel={t(
          USER_ARTIFACTS_CATEGORY,
          "pm.description.questionnaire.submit_label",
          "Submit questionnaire"
        )}
        title={title}
      />
      <DescriptionProviderPicker
        onCancel={handleProviderCancel}
        onConfirm={handleProviderConfirm}
        providers={providerOptions}
        visible={providerPickerOpen}
      />
    </div>
  );
};
