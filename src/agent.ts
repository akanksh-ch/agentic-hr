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
import { queryCompanyPolicies } from "./tools/queryCompanyPolicies.js";

type AgentProcessData = {
  vad?: silero.VAD;
};

export default defineAgent<AgentProcessData>({
  prewarm: async (proc: JobProcess<AgentProcessData>) => {
    proc.userData.vad = await silero.VAD.load();
  },

  entry: async (ctx: JobContext<AgentProcessData>) => {
    await ctx.connect();

    const agent = new voice.Agent({
      instructions: [
        "You are Agentic HR, a policy-grounded HR assistant for testing.",
        "When the user asks any company policy question, call queryCompanyPolicies first.",
        "Use only the retrieved policy chunks to answer.",
        "If the retrieved chunks do not contain enough information, say you do not have enough policy information and recommend contacting People Operations.",
        "Do not invent benefits, exceptions, approvals, payroll decisions, or legal interpretations.",
        "Keep answers concise and mention the most relevant policy section."
      ].join(" "),
      tools: {
        queryCompanyPolicies
      }
    });

    const session = new voice.AgentSession({
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
        "Briefly greet the employee and say you can answer HR policy questions using the company policy database."
    });
  }
});

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url) }));
