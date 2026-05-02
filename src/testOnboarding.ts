import { closeMongoClient } from "./db/mongo.js";
import { getMissingOnboardingFields, getNextOnboardingQuestion } from "./onboarding/onboardingFlow.js";
import { updateOnboardingProfile } from "./onboarding/onboardingStore.js";

async function main() {
  const employeeId = process.argv[2] ?? "demo_employee";

  const profile = await updateOnboardingProfile(employeeId, {
    conversationPreference: "chat",
    personalDetails: {
      name: "Demo Employee",
      email: "demo.employee@example.com",
      phone: "+44 7000 000000",
      dob: "1998-01-01",
      address: "123 Demo Street, London"
    },
    workerType: "IT",
    expertise: ["Java", "AWS"],
    requirements: ["Laptop", "AWS access", "IDE license"]
  });

  const missingFields = getMissingOnboardingFields(profile);

  console.log(JSON.stringify(
    {
      employeeId,
      status: profile.status,
      missingFields,
      nextQuestion: getNextOnboardingQuestion(missingFields),
      mockActions: profile.mockActions
    },
    null,
    2
  ));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
