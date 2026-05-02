# Agentic HR Demo Script

Use this script after starting the worker and dispatching the agent.

## Start

```bash
npm run onboarding:status -- emp_123 --reset
npm run agent:dev
```

In another terminal:

```bash
npm run dispatch:test -- onboarding-demo-room emp_123 --token
```

Join `onboarding-demo-room` from the frontend using the printed token.

## Onboarding Conversation

The agent should ask one question at a time. You can answer with mock details:

```text
I prefer chat.
My full name is Alex Morgan.
Use alex.morgan@example.com.
My phone number is +44 7700 900123.
My date of birth is 1996-04-12.
My address is 42 Hackathon Lane, London.
I am joining as IT.
My skills are Java, AWS, and analytics.
I need a laptop, AWS access, an IDE license, and access to the ticketing system.
```

Expected result:

```text
Onboarding complete. The agent summarizes the saved profile and queued mock actions.
```

Check what was saved:

```bash
npm run onboarding:status -- emp_123
```

## Policy Query

After onboarding, ask:

```text
If I move to another country, do I keep my location-based benefits?
```

Expected result:

```text
The agent searches the policy database and answers from the retrieved policy chunks.
```
