import { closeMongoClient } from "./db/mongo.js";
import { getMissingOnboardingFields, getNextOnboardingQuestion } from "./onboarding/onboardingFlow.js";
import { getOnboardingProfile, resetOnboardingProfile } from "./onboarding/onboardingStore.js";

async function main() {
  const employeeId = process.argv[2] ?? "demo_employee";
  const shouldReset = process.argv.includes("--reset");

  if (shouldReset) {
    const deleted = await resetOnboardingProfile(employeeId);
    console.log(
      JSON.stringify(
        {
          employeeId,
          reset: true,
          deletedExistingProfile: deleted
        },
        null,
        2
      )
    );
    return;
  }

  const profile = await getOnboardingProfile(employeeId);
  const missingFields = getMissingOnboardingFields(profile ?? { employeeId });

  console.log(
    JSON.stringify(
      {
        employeeId,
        status: profile?.status ?? "not_started",
        missingFields,
        nextQuestion: getNextOnboardingQuestion(missingFields),
        profile
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
