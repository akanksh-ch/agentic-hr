export const workerTypes = ["IT", "Core", "Management"] as const;
export type WorkerType = (typeof workerTypes)[number];

export type OnboardingProfile = {
  employeeId: string;
  status: "in_progress" | "completed";
  personalDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    dob?: string;
    address?: string;
  };
  workerType?: WorkerType;
  expertise?: string[];
  requirements?: string[];
  conversationPreference?: "chat" | "voice" | "either";
  mockActions?: MockOnboardingAction[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
};

export type MockOnboardingAction = {
  action:
    | "create_employee_record"
    | "notify_people_ops"
    | "prepare_equipment_request"
    | "prepare_access_request"
    | "schedule_manager_review";
  status: "queued";
  payload: Record<string, unknown>;
};

export type OnboardingPatch = {
  personalDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    dob?: string;
    address?: string;
  };
  workerType?: WorkerType;
  expertise?: string[];
  requirements?: string[];
  conversationPreference?: "chat" | "voice" | "either";
};
