import { closeMongoClient } from "./db/mongo.js";
import { buildOnboardingDisplaySummary } from "./onboarding/onboardingSummary.js";
import { getOnboardingProfile } from "./onboarding/onboardingStore.js";

async function main() {
  const employeeId = process.argv[2] ?? "demo_employee";
  const profile = await getOnboardingProfile(employeeId);
  const summary = buildOnboardingDisplaySummary(profile, employeeId);

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
