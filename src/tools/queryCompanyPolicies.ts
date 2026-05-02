import { llm } from "@livekit/agents";
import { z } from "zod";
import { retrievePolicyContext } from "../rag/retriever.js";

export const queryCompanyPolicies = llm.tool({
  description:
    "Search approved company HR policies using vector search. Use this before answering questions about onboarding, benefits, work location, hardware stipend, tool access, culture buddy, dashboards, approvals, notifications, or meeting buffers.",
  parameters: z.object({
    question: z.string().min(3).describe("The employee's exact HR policy question."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(8)
      .default(5)
      .describe("How many policy chunks to retrieve.")
  }),
  execute: async ({ question, limit }) => {
    const chunks = await retrievePolicyContext(question, { limit });

    if (chunks.length === 0) {
      return {
        found: false,
        message:
          "No relevant policy chunks were found. Tell the employee there is not enough policy information and recommend contacting People Operations.",
        chunks: []
      };
    }

    return {
      found: true,
      chunks: chunks.map((chunk) => ({
        text: chunk.text,
        source: chunk.metadata.source,
        section: chunk.metadata.section,
        category: chunk.metadata.category,
        score: chunk.score
      }))
    };
  }
});
