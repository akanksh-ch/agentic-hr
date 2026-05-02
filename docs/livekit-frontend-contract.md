# LiveKit Frontend Contract

The frontend should talk to Agentic HR through LiveKit, not a separate REST API.

## Agent Name

Dispatch or connect to this agent name:

```text
agentic-hr
```

This comes from:

```env
LIVEKIT_AGENT_NAME=agentic-hr
```

## Employee Metadata

Pass the employee id as JSON metadata when dispatching the agent or creating the room:

```json
{
  "employeeId": "emp_123"
}
```

For a local dispatch test, keep `npm run agent:dev` running in one terminal and run:

```bash
npm run dispatch:test -- onboarding-demo-room emp_123
```

To also print a temporary frontend join token for the same room:

```bash
npm run dispatch:test -- onboarding-demo-room emp_123 --token
```

Your frontend should do the equivalent dispatch server-side:

```ts
import { AgentDispatchClient } from "livekit-server-sdk";

const dispatchClient = new AgentDispatchClient(
  process.env.LIVEKIT_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

await dispatchClient.createDispatch("onboarding-demo-room", "agentic-hr", {
  metadata: JSON.stringify({ employeeId: "emp_123" })
});
```

If no employee id is provided, the local worker falls back to:

```text
demo_employee
```

Before a demo, you can reset an employee's saved onboarding state:

```bash
npm run onboarding:status -- emp_123 --reset
```

After a LiveKit onboarding conversation, inspect what the agent saved:

```bash
npm run onboarding:status -- emp_123
```

## Agent Behavior

The agent starts onboarding first. It asks one question at a time and stores answers in MongoDB.

Required onboarding fields:

- chat, voice, or either preference
- name
- email
- phone
- date of birth
- address
- worker type: IT, Core, or Management
- expertise/skills
- requirements from employer

The agent can also answer policy questions during the same session. Policy questions use:

```text
Voyage query embedding -> MongoDB Vector Search -> LiveKit Inference LLM
```

## MongoDB Collections

Policy chunks:

```env
MONGODB_COLLECTION=Policies
```

Onboarding sessions:

```env
MONGODB_ONBOARDING_COLLECTION=onboarding_sessions
```
