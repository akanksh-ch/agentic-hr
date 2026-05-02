import { config } from "../config.js";
import { getMongoClient } from "../db/mongo.js";
import type { OnboardingPatch, OnboardingProfile } from "./onboardingTypes.js";
import {
  createMockOnboardingActions,
  getMissingOnboardingFields,
  mergeOnboardingPatch
} from "./onboardingFlow.js";

async function getOnboardingCollection() {
  const mongo = await getMongoClient();
  return mongo.db(config.MONGODB_DB).collection<OnboardingProfile>(config.MONGODB_ONBOARDING_COLLECTION);
}

export async function getOnboardingProfile(employeeId: string): Promise<OnboardingProfile | null> {
  const collection = await getOnboardingCollection();
  return collection.findOne({ employeeId }, { projection: { _id: 0 } });
}

export async function resetOnboardingProfile(employeeId: string): Promise<boolean> {
  const collection = await getOnboardingCollection();
  const result = await collection.deleteOne({ employeeId });
  return result.deletedCount > 0;
}

export async function updateOnboardingProfile(
  employeeId: string,
  patch: OnboardingPatch
): Promise<OnboardingProfile> {
  const collection = await getOnboardingCollection();
  const now = new Date();
  const existing = await getOnboardingProfile(employeeId);
  const merged = mergeOnboardingPatch(existing ?? { employeeId }, patch);
  const missingFields = getMissingOnboardingFields(merged);
  const isCompleted = missingFields.length === 0;

  const nextProfile: OnboardingProfile = {
    employeeId,
    status: isCompleted ? "completed" : "in_progress",
    personalDetails: merged.personalDetails,
    workerType: merged.workerType,
    expertise: merged.expertise,
    requirements: merged.requirements,
    conversationPreference: merged.conversationPreference,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    completedAt: isCompleted ? (existing?.completedAt ?? now) : undefined,
    mockActions: []
  };

  nextProfile.mockActions = isCompleted ? createMockOnboardingActions(nextProfile) : [];

  await collection.replaceOne({ employeeId }, nextProfile, { upsert: true });

  return nextProfile;
}
