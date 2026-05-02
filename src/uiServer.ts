import cors from "cors";
import "dotenv/config";
import express from "express";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { z } from "zod";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { config } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const isProd = process.argv.includes("--prod") || process.env.NODE_ENV === "production";

const sessionRequestSchema = z.object({
  employeeId: z.string().min(1).default("demo_employee"),
  roomName: z.string().min(1).optional()
});

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
    identity: `employee-${employeeId}-${Date.now()}`,
    name: employeeId,
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

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post("/api/session", async (req, res, next) => {
    try {
      const body = sessionRequestSchema.parse(req.body);
      const { url, apiKey, apiSecret } = requireLiveKitConfig();
      const employeeId = body.employeeId;
      const roomName = body.roomName ?? `agentic-hr-${employeeId}-${Date.now()}`;
      const metadata = JSON.stringify({ employeeId });
      const dispatchClient = new AgentDispatchClient(url, apiKey, apiSecret);

      await dispatchClient.createDispatch(roomName, config.LIVEKIT_AGENT_NAME, { metadata });
      const token = await createJoinToken(roomName, employeeId);

      res.json({
        url,
        token,
        roomName,
        employeeId,
        agentName: config.LIVEKIT_AGENT_NAME
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.flatten() });
      return;
    }

    console.error(error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "UI server failed"
    });
  });

  if (isProd) {
    const distPath = path.resolve(projectRoot, "dist-ui");
    if (!existsSync(distPath)) {
      throw new Error("dist-ui does not exist. Run npm run ui:build first.");
    }
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: path.resolve(projectRoot, "web")
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.UI_PORT ?? 5173);
  app.listen(port, () => {
    console.log(`Agentic HR UI listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
