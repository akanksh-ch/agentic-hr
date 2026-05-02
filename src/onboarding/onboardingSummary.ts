import type { MockOnboardingAction, OnboardingProfile } from "./onboardingTypes.js";

export type OnboardingDisplaySummary = {
  employeeId: string;
  status: OnboardingProfile["status"] | "not_started";
  profileSummary: {
    name?: string;
    email?: string;
    phone?: string;
    dob?: string;
    address?: string;
    workerType?: string;
    conversationPreference?: string;
    expertise: string[];
    requirements: string[];
  };
  mockActions: Array<{
    label: string;
    status: MockOnboardingAction["status"];
    payload: Record<string, unknown>;
  }>;
};

export function actionLabel(action: MockOnboardingAction["action"]): string {
  switch (action) {
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
}

export function buildOnboardingDisplaySummary(
  profile: OnboardingProfile | null,
  employeeId: string
): OnboardingDisplaySummary {
  return {
    employeeId,
    status: profile?.status ?? "not_started",
    profileSummary: {
      name: profile?.personalDetails?.name,
      email: profile?.personalDetails?.email,
      phone: profile?.personalDetails?.phone,
      dob: profile?.personalDetails?.dob,
      address: profile?.personalDetails?.address,
      workerType: profile?.workerType,
      conversationPreference: profile?.conversationPreference,
      expertise: profile?.expertise ?? [],
      requirements: profile?.requirements ?? []
    },
    mockActions: (profile?.mockActions ?? []).map((action) => ({
      label: actionLabel(action.action),
      status: action.status,
      payload: action.payload
    }))
  };
}
