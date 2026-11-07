export type StudyCard = {term: string; definition: string; termImage?: string; definitionImage?: string};

/** Ignore ordering, outer whitespace and Unicode representation when comparing content. */
export function canonicalCards(cards: StudyCard[]): string {
  return JSON.stringify(cards.map(c => [c.term.trim().normalize('NFC'), c.definition.trim().normalize('NFC'), ...(c.termImage || c.definitionImage ? [c.termImage || '', c.definitionImage || ''] : [])])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}
