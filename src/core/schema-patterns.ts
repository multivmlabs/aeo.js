/**
 * Detect FAQ-like patterns in markdown/text content.
 * Looks for question headings followed by answer text.
 */
export function detectFaqPatterns(content: string): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = [];

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headingMatch = line.match(/^#{1,6}\s+((?:What|How|Why|When|Where|Who|Which|Is|Are|Can|Do|Does|Should|Will|Was|Were|Did|Has|Have|Could|Would)\b.+\?)\s*$/i);
    if (headingMatch) {
      const answerLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) {
          if (answerLines.length > 0) break;
          continue;
        }
        if (/^#{1,6}\s/.test(nextLine)) break;
        answerLines.push(nextLine);
      }
      if (answerLines.length > 0) {
        items.push({
          question: headingMatch[1],
          answer: answerLines.join(' ').slice(0, 500),
        });
      }
    }
  }

  return items;
}

/**
 * Detect HowTo step patterns in markdown/text content.
 * Looks for numbered step headings and returns steps only when at least two exist.
 */
export function detectHowToSteps(content: string): { name: string; text: string }[] {
  const steps: { name: string; text: string }[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const stepMatch = line.match(/^#{1,6}\s+(?:Step\s+\d+[\s:.-]*|(\d+)[.)]\s*)(.+)$/i);
    if (stepMatch) {
      const name = (stepMatch[2] || stepMatch[1] || '').trim();
      const bodyLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) {
          if (bodyLines.length > 0) break;
          continue;
        }
        if (/^#{1,6}\s/.test(nextLine)) break;
        bodyLines.push(nextLine);
      }
      if (name) {
        steps.push({
          name,
          text: bodyLines.join(' ').slice(0, 500),
        });
      }
    }
  }

  return steps.length >= 2 ? steps : [];
}
