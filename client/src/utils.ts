export function fmt(dt: any) {
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return String(dt);
    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" });
    return `${date} ${time}`;
  } catch {
    return String(dt);
  }
}

export function indent(text: string, spaces = 4) {
  const pad = ' '.repeat(spaces);
  return String(text || '')
    .trim()
    .split('\n')
    .map((l) => pad + l)
    .join('\n');
}

export function buildConceptSpec({ name, purpose, state, actions, queries, operational }: { name: string; purpose: string; state: string; actions: string; queries?: string; operational?: string; }) {
  const hasQueries = (String(queries || '').trim().length > 0);
  const hasOperational = (String(operational || '').trim().length > 0);
  return `<concept_spec>\n\nconcept ${name}\n\npurpose\n${indent(purpose)}\n\nstate\n${indent(state)}\n\nactions\n${indent(actions)}\n${hasQueries ? `\nqueries\n${indent(queries!)}` : ''}\n${hasOperational ? `\noperational principle\n${indent(operational!)}` : ''}\n\n</concept_spec>`;
}
