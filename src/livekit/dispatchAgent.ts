import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { config } from "../config.js";

function requireLiveKitConfig() {
  if (!config.LIVEKIT_URL || !config.LIVEKIT_API_KEY || !config.LIVEKIT_API_SECRET) {
    throw new Error(
      "Missing LiveKit config. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in .env."
    );
  }

  return {
    url: config.LIVEKIT_URL,
    apiKey: config.LIVEKIT_API_KEY,
    apiSecret: config.LIVEKIT_API_SECRET
  };
}

async function createJoinToken(roomName: string, employeeId: string) {
  const { apiKey, apiSecret } = requireLiveKitConfig();
  const token = new AccessToken(apiKey, apiSecret, {
    identity: `employee-${employeeId}`,
    name: `Employee ${employeeId}`,
    metadata: JSON.stringify({ employeeId })
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  return token.toJwt();
}

async function main() {
  const roomName = process.argv[2] ?? `agentic-hr-demo-${Date.now()}`;
  const employeeId = process.argv[3] ?? "demo_employee";
  const shouldPrintToken = process.argv.includes("--token");
  const { url, apiKey, apiSecret } = requireLiveKitConfig();
  const dispatchClient = new AgentDispatchClient(url, apiKey, apiSecret);
  const metadata = JSON.stringify({ employeeId });

  const dispatch = await dispatchClient.createDispatch(roomName, config.LIVEKIT_AGENT_NAME, {
    metadata
  });

  console.log(
    JSON.stringify(
      {
        roomName,
        agentName: config.LIVEKIT_AGENT_NAME,
        employeeId,
        dispatchId: dispatch.id,
        metadata
      },
      null,
      2
    )
  );

  if (shouldPrintToken) {
    const token = await createJoinToken(roomName, employeeId);
    console.log("\nFrontend test token:");
    console.log(token);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
