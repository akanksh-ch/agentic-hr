import { useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useChat,
  useConnectionState,
  useLocalParticipant,
  useVoiceAssistant
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";

type SessionInfo = {
  url: string;
  token: string;
  roomName: string;
  employeeId: string;
  agentName: string;
};

type UiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
};

async function createSession(employeeId: string): Promise<SessionInfo> {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Unable to create LiveKit session");
  }

  return response.json() as Promise<SessionInfo>;
}

export function App() {
  const [employeeId, setEmployeeId] = useState("emp_123");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [status, setStatus] = useState("Ready");
  const [isStarting, setIsStarting] = useState(false);

  async function start() {
    setIsStarting(true);
    setStatus("Creating LiveKit room...");
    try {
      const nextSession = await createSession(employeeId.trim() || "demo_employee");
      setSession(nextSession);
      setStatus(`Connected to ${nextSession.roomName}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to start session");
    } finally {
      setIsStarting(false);
    }
  }

  function stop() {
    setSession(null);
    setStatus("Disconnected");
  }

  return (
    <main className="app-shell">
      <section className="sidebar">
        <div>
          <div className="brand">Agentic HR</div>
          <p className="muted">LiveKit onboarding and policy assistant</p>
        </div>

        <label className="field">
          <span>Employee ID</span>
          <input
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            disabled={Boolean(session) || isStarting}
            placeholder="emp_123"
          />
        </label>

        <div className="actions">
          {!session ? (
            <button onClick={start} disabled={isStarting}>
              {isStarting ? "Starting..." : "Start Session"}
            </button>
          ) : (
            <button className="secondary" onClick={stop}>
              Disconnect
            </button>
          )}
        </div>

        <div className="status">
          <span className={session ? "dot online" : "dot"} />
          <span>{status}</span>
        </div>

        {session && (
          <div className="session-meta">
            <div>
              <span>Room</span>
              <strong>{session.roomName}</strong>
            </div>
            <div>
              <span>Agent</span>
              <strong>{session.agentName}</strong>
            </div>
          </div>
        )}
      </section>

      <section className="chat-pane">
        {session ? (
          <LiveKitRoom
            serverUrl={session.url}
            token={session.token}
            connect
            audio
            video={false}
            onDisconnected={() => setStatus("Disconnected from LiveKit")}
          >
            <RoomAudioRenderer />
            <ChatExperience employeeId={session.employeeId} />
          </LiveKitRoom>
        ) : (
          <div className="empty-state">
            <h1>Start a session to chat with Agentic HR</h1>
            <p>
              The UI will create a LiveKit room, dispatch the agent, and pass the employee id as
              metadata.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function ChatExperience({ employeeId }: { employeeId: string }) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<UiMessage[]>([]);
  const { send, chatMessages, isSending } = useChat();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const { state: agentState, agentTranscriptions } = useVoiceAssistant();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const messages = useMemo<UiMessage[]>(() => {
    const chat = chatMessages.map((message) => ({
      id: message.id,
      role: message.from?.isLocal ? "user" as const : "assistant" as const,
      text: message.message,
      timestamp: message.timestamp
    }));

    const transcripts = agentTranscriptions
      .filter((segment) => segment.final)
      .map((segment) => ({
        id: segment.id,
        role: "assistant" as const,
        text: segment.text,
        timestamp: Date.now()
      }));

    const combined = [...localMessages, ...chat, ...transcripts];
    const seen = new Set<string>();

    return combined
      .filter((message) => {
        const key = `${message.role}:${message.text}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return Boolean(message.text.trim());
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [agentTranscriptions, chatMessages, localMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = draft.trim();
    if (!text) return;

    setDraft("");
    setLocalMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        role: "user",
        text,
        timestamp: Date.now()
      }
    ]);
    await send(text);
  }

  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  }

  return (
    <div className="chat-layout">
      <header className="chat-header">
        <div>
          <h1>Agentic HR</h1>
          <p>Employee {employeeId}</p>
        </div>
        <div className="header-controls">
          <span className="pill">{connectionStateLabel(connectionState)}</span>
          <span className="pill">Agent {agentState}</span>
          <button className="mic-button" onClick={toggleMic}>
            {localParticipant.isMicrophoneEnabled ? "Mute" : "Mic"}
          </button>
        </div>
      </header>

      <div className="message-list">
        {messages.length === 0 && (
          <div className="assistant-message">
            <div className="avatar">HR</div>
            <div className="bubble">
              Waiting for the agent. You can type here or use the microphone once connected.
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            className={message.role === "user" ? "user-message" : "assistant-message"}
            key={message.id}
          >
            {message.role !== "user" && <div className="avatar">HR</div>}
            <div className="bubble">{message.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Type an onboarding answer or policy question..."
        />
        <button type="submit" disabled={isSending || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

function connectionStateLabel(state: ConnectionState) {
  switch (state) {
    case ConnectionState.Connected:
      return "Connected";
    case ConnectionState.Connecting:
      return "Connecting";
    case ConnectionState.Reconnecting:
      return "Reconnecting";
    default:
      return "Disconnected";
  }
}
