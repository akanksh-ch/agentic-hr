type RawSection = {
  title: string;
  content: string;
};

export function splitMarkdownIntoSections(markdown: string): RawSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: RawSection[] = [];
  let currentTitle = "Document Overview";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentLines.join("\n").trim()) {
        sections.push({
          title: currentTitle,
          content: currentLines.join("\n").trim()
        });
      }

      currentTitle = line.replace(/^##\s+/, "").trim();
      currentLines = [line];
      continue;
    }

    currentLines.push(line);
  }

  if (currentLines.join("\n").trim()) {
    sections.push({
      title: currentTitle,
      content: currentLines.join("\n").trim()
    });
  }

  return sections;
}

export function chunkSection(section: RawSection, maxCharacters = 1400): string[] {
  const paragraphs = section.content.split(/\n\s*\n/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length <= maxCharacters) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    current = paragraph;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function inferCategory(sectionTitle: string): string {
  const title = sectionTitle.toLowerCase();

  if (title.includes("location") || title.includes("benefit")) return "benefits";
  if (title.includes("hardware") || title.includes("ergonomic")) return "equipment";
  if (title.includes("knowledge")) return "knowledge_orientation";
  if (title.includes("social") || title.includes("buddy")) return "culture";
  if (title.includes("tool access")) return "tool_access";
  if (title.includes("manager") || title.includes("bi")) return "manager_access";
  if (title.includes("approval")) return "approval_workflows";
  if (title.includes("notification") || title.includes("meeting")) return "work_preferences";
  if (title.includes("query")) return "assistant_guardrails";

  return "general";
}
