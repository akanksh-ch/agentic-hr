import { llm } from "@livekit/agents";
import { z } from "zod";
import {
  buildCompletionSummary,
  buildOnboardingAssistantInstruction,
  getMissingOnboardingFields,
  getNextOnboardingQuestion,
  getValidationHint
} from "../onboarding/onboardingFlow.js";
import { getOnboardingProfile, updateOnboardingProfile } from "../onboarding/onboardingStore.js";

const workerTypeSchema = z.enum(["IT", "Core", "Management"]);
const preferenceSchema = z.enum(["chat", "voice", "either"]);

type OnboardingToolUserData = {
  employeeId: string;
};

export const saveOnboardingDetails = llm.tool({
  description:
    "Save any onboarding details the new employee has provided. Call this after each onboarding answer, then use the returned nextQuestion to continue one field at a time.",
  parameters: z.object({
    employeeId: z
      .string()
      .optional()
      .describe("The known employee id. Use the employee id from session context when available."),
    personalDetails: z
      .object({
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        dob: z.string().optional(),
        address: z.string().optional()
      })
      .optional(),
    workerType: workerTypeSchema.optional(),
    expertise: z.array(z.string()).optional(),
    requirements: z.array(z.string()).optional(),
    conversationPreference: preferenceSchema.optional()
  }),
  execute: async (args, opts) => {
    const userData = opts.ctx.userData as OnboardingToolUserData;
    const employeeId = args.employeeId ?? userData.employeeId;
    const profile = await updateOnboardingProfile(employeeId, {
      personalDetails: args.personalDetails,
      workerType: args.workerType,
      expertise: args.expertise,
      requirements: args.requirements,
      conversationPreference: args.conversationPreference
    });
    const missingFields = getMissingOnboardingFields(profile);
    const nextQuestion = getNextOnboardingQuestion(missingFields);

    return {
      employeeId,
      status: profile.status,
      savedProfile: profile,
      missingFields,
      nextQuestion,
      validationHint: getValidationHint(missingFields[0]),
      assistantInstruction:
        profile.status === "completed"
          ? buildCompletionSummary(profile)
          : buildOnboardingAssistantInstruction(profile),
      mockActions: profile.mockActions ?? []
    };
  }
});

export const getOnboardingStatus = llm.tool({
  description:
    "Check the saved onboarding status for the current new employee, including missing fields and the next question to ask.",
  parameters: z.object({
    employeeId: z.string().optional()
  }),
  execute: async (args, opts) => {
    const userData = opts.ctx.userData as OnboardingToolUserData;
    const employeeId = args.employeeId ?? userData.employeeId;
    const profile = await getOnboardingProfile(employeeId);
    const missingFields = getMissingOnboardingFields(profile ?? { employeeId });
    const nextQuestion = getNextOnboardingQuestion(missingFields);

    return {
      employeeId,
      status: profile?.status ?? "not_started",
      savedProfile: profile,
      missingFields,
      nextQuestion,
      validationHint: getValidationHint(missingFields[0]),
      assistantInstruction: buildOnboardingAssistantInstruction(profile ?? { employeeId })
    };
  }
});
