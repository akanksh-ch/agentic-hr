import type { MockOnboardingAction, OnboardingPatch, OnboardingProfile } from "./onboardingTypes.js";

export const requiredOnboardingFields = [
  "conversationPreference",
  "personalDetails.name",
  "personalDetails.email",
  "personalDetails.phone",
  "personalDetails.dob",
  "personalDetails.address",
  "workerType",
  "expertise",
  "requirements"
] as const;

export function getMissingOnboardingFields(profile: Partial<OnboardingProfile>): string[] {
  const missing: string[] = [];
  const personal = profile.personalDetails ?? {};

  if (!profile.conversationPreference) missing.push("conversationPreference");
  if (!personal.name) missing.push("personalDetails.name");
  if (!personal.email) missing.push("personalDetails.email");
  if (!personal.phone) missing.push("personalDetails.phone");
  if (!personal.dob) missing.push("personalDetails.dob");
  if (!personal.address) missing.push("personalDetails.address");
  if (!profile.workerType) missing.push("workerType");
  if (!profile.expertise?.length) missing.push("expertise");
  if (!profile.requirements?.length) missing.push("requirements");

  return missing;
}

export function getNextOnboardingQuestion(missingFields: string[]): string | null {
  const next = missingFields[0];

  switch (next) {
    case "conversationPreference":
      return "Before we begin, do you prefer to continue onboarding by chat, voice, or either?";
    case "personalDetails.name":
      return "What is your full name?";
    case "personalDetails.email":
      return "What email address should we keep on your employee profile?";
    case "personalDetails.phone":
      return "What phone number should we keep on file?";
    case "personalDetails.dob":
      return "What is your date of birth?";
    case "personalDetails.address":
      return "What is your current home address?";
    case "workerType":
      return "What type of worker are you joining as: IT, Core, or Management?";
    case "expertise":
      return "What skills or areas of expertise should we record for you? For example Java, AWS, design, analytics, or people management.";
    case "requirements":
      return "What do you need from the employer to do your work well? This can include hardware, software access, accounts, tools, or support.";
    default:
      return null;
  }
}

export function getValidationHint(field: string | null | undefined): string | null {
  switch (field) {
    case "workerType":
      return "The worker type must be exactly IT, Core, or Management.";
    case "expertise":
      return "Save expertise as a list of skills, such as Java, AWS, analytics, design, or people management.";
    case "requirements":
      return "Save requirements as a list of employer-provided needs, such as laptop, monitor, software access, cloud access, licenses, accounts, or support.";
    case "conversationPreference":
      return "The preference should be chat, voice, or either.";
    default:
      return null;
  }
}

export function buildOnboardingAssistantInstruction(profile: Partial<OnboardingProfile>): string {
  const missingFields = getMissingOnboardingFields(profile);
  const nextQuestion = getNextOnboardingQuestion(missingFields);
  const validationHint = getValidationHint(missingFields[0]);

  if (!nextQuestion) {
    return buildCompletionSummary(profile as OnboardingProfile);
  }

  return [
    "Ask exactly this next onboarding question and nothing else:",
    nextQuestion,
    validationHint ? `Hint if the employee seems unsure: ${validationHint}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCompletionSummary(profile: OnboardingProfile): string {
  const actionLabels = (profile.mockActions ?? []).map((action) => {
    switch (action.action) {
      case "create_employee_record":
        return "Create employee record";
      case "notify_people_ops":
        return "Notify People Operations";
      case "prepare_equipment_request":
        return "Prepare equipment request";
      case "prepare_access_request":
        return "Prepare access request";
      case "schedule_manager_review":
        return "Schedule manager setup review";
    }
  });

  return [
    "Onboarding complete. Summarize this saved profile briefly and mention the queued mock actions.",
    `Name: ${profile.personalDetails?.name ?? "Not provided"}`,
    `Email: ${profile.personalDetails?.email ?? "Not provided"}`,
    `Phone: ${profile.personalDetails?.phone ?? "Not provided"}`,
    `Date of birth: ${profile.personalDetails?.dob ?? "Not provided"}`,
    `Address: ${profile.personalDetails?.address ?? "Not provided"}`,
    `Worker type: ${profile.workerType ?? "Not provided"}`,
    `Expertise: ${(profile.expertise ?? []).join(", ") || "Not provided"}`,
    `Requirements: ${(profile.requirements ?? []).join(", ") || "Not provided"}`,
    `Queued mock actions: ${actionLabels.join(", ") || "None"}`
  ].join("\n");
}

export function mergeOnboardingPatch(
  existing: Partial<OnboardingProfile>,
  patch: OnboardingPatch
): Partial<OnboardingProfile> {
  return {
    ...existing,
    ...patch,
    personalDetails: {
      ...existing.personalDetails,
      ...patch.personalDetails
    }
  };
}

export function createMockOnboardingActions(profile: OnboardingProfile): MockOnboardingAction[] {
  const expertise = profile.expertise ?? [];
  const requirements = profile.requirements ?? [];

  const actions: MockOnboardingAction[] = [
    {
      action: "create_employee_record",
      status: "queued",
      payload: {
        employeeId: profile.employeeId,
        name: profile.personalDetails?.name,
        workerType: profile.workerType
      }
    },
    {
      action: "notify_people_ops",
      status: "queued",
      payload: {
        employeeId: profile.employeeId,
        missingAuthenticVerification: true
      }
    }
  ];

  if (requirements.length > 0) {
    actions.push({
      action: "prepare_equipment_request",
      status: "queued",
      payload: {
        employeeId: profile.employeeId,
        requirements
      }
    });
  }

  if (expertise.length > 0) {
    actions.push({
      action: "prepare_access_request",
      status: "queued",
      payload: {
        employeeId: profile.employeeId,
        workerType: profile.workerType,
        expertise,
        suggestedAccess: suggestAccessFromProfile(profile)
      }
    });
  }

  if (profile.workerType === "Management") {
    actions.push({
      action: "schedule_manager_review",
      status: "queued",
      payload: {
        employeeId: profile.employeeId,
        reason: "Confirm authority, approval, and dashboard requirements."
      }
    });
  }

  return actions;
}

function suggestAccessFromProfile(profile: OnboardingProfile): string[] {
  const skills = new Set((profile.expertise ?? []).map((skill) => skill.toLowerCase()));
  const access = new Set<string>();

  if (profile.workerType === "IT") {
    access.add("ticketing_system");
    access.add("developer_workspace");
  }

  if (profile.workerType === "Management") {
    access.add("manager_dashboard");
    access.add("approval_workflows");
  }

  if (skills.has("aws")) access.add("cloud_console_review");
  if (skills.has("java")) access.add("engineering_repo_review");
  if (skills.has("analytics")) access.add("analytics_dashboard_review");
  if (skills.has("figma") || skills.has("design")) access.add("design_workspace_review");

  return Array.from(access);
}
