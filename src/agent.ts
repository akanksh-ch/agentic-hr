import {
  ServerOptions,
  cli,
  defineAgent,
  inference,
  type JobContext,
  type JobProcess,
  voice
} from "@livekit/agents";
import * as silero from "@livekit/agents-plugin-silero";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { getOnboardingStatus, saveOnboardingDetails } from "./tools/onboardingTool.js";
import { queryCompanyPolicies } from "./tools/queryCompanyPolicies.js";

type AgentProcessData = {
  vad?: silero.VAD;
};

type AgentSessionData = {
  employeeId: string;
};

function getEmployeeIdFromJob(ctx: JobContext<AgentProcessData>) {
  const metadataCandidates = [
    (ctx.job as { metadata?: string }).metadata,
    (ctx.job.room as { metadata?: string } | undefined)?.metadata,
    ctx.room.metadata
  ].filter(Boolean);

  for (const metadata of metadataCandidates) {
    try {
      const parsed = JSON.parse(metadata as string) as { employeeId?: string };
      if (parsed.employeeId) {
        return parsed.employeeId;
      }
    } catch {
      // Metadata can be plain text; fall through to other sources.
    }
  }

  return "demo_employee";
}

export default defineAgent<AgentProcessData>({
  prewarm: async (proc: JobProcess<AgentProcessData>) => {
    proc.userData.vad = await silero.VAD.load();
  },

  entry: async (ctx: JobContext<AgentProcessData>) => {
    await ctx.connect();
    const employeeId = getEmployeeIdFromJob(ctx);

    const agent = new voice.Agent<AgentSessionData>({
      instructions: [
        "You are Agentic HR, an onboarding and policy assistant for a newly hired employee.",
        `The known employee id is ${employeeId}. The employee has been hired and needs onboarding.`,
        "Start with onboarding unless the employee asks a policy question.",
        "For onboarding, ask one question at a time. First ask whether they prefer chat, voice, or either for onboarding.",
        "Collect and save these onboarding fields: full name, email, phone, date of birth, address, worker type, expertise, and work requirements.",
        "Worker type must be one of IT, Core, or Management.",
        "Expertise should be saved as an array of skills, such as Java, AWS, analytics, design, or people management.",
        "Requirements should be saved as an array of things the employee needs from the employer, such as laptop, monitor, AWS access, IDE license, CMS access, analytics dashboard, or manager dashboard.",
        "After every employee answer, call saveOnboardingDetails with the new information.",
        "After calling an onboarding tool, follow its assistantInstruction exactly.",
        "Do not ask multiple onboarding questions in the same turn.",
        "When onboarding status is completed, summarize the saved profile and mock actions briefly using the tool result.",
        "When the user asks any company policy question, call queryCompanyPolicies first.",
        "Use only the retrieved policy chunks to answer policy questions.",
        "If the retrieved chunks do not contain enough information, say you do not have enough policy information and recommend contacting People Operations.",
        "Do not invent benefits, exceptions, approvals, payroll decisions, or legal interpretations.",
        "Keep answers concise."
      ].join(" "),
      tools: {
        getOnboardingStatus,
        saveOnboardingDetails,
        queryCompanyPolicies
      }
    });

    const session = new voice.AgentSession<AgentSessionData>({
      userData: {
        employeeId
      },
      vad: ctx.proc.userData.vad,
      stt: new inference.STT({ model: "deepgram/nova-3", language: "en" }),
      llm: new inference.LLM({
        model: config.LIVEKIT_QUERY_LLM_MODEL,
        modelOptions: {
          temperature: 0.2
        }
      }),
      tts: new inference.TTS({
        model: "cartesia/sonic-3",
        voice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"
      }),
      maxToolSteps: 3
    });

    await session.start({
      agent,
      room: ctx.room
    });

    await session.generateReply({
      instructions:
        "Briefly greet the new employee, say you will onboard them one step at a time, and ask whether they prefer chat, voice, or either for the onboarding questions."
    });
  }
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: config.LIVEKIT_AGENT_NAME
  })
);
