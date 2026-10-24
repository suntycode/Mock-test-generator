import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const taxonomyPath = new URL('../taxonomy/rrb-ntpc.taxonomy.json', import.meta.url);

export async function loadTaxonomy() {
  return JSON.parse(await readFile(fileURLToPath(taxonomyPath), 'utf8'));
}

function matchName(values, candidate) {
  if (typeof candidate !== 'string') return undefined;
  const normalized = candidate.trim().toLocaleLowerCase();
  return values.find((value) => value.toLocaleLowerCase() === normalized);
}

export function normalizeTags({ section, category, subcategory, qNo }, taxonomy) {
  let canonicalSection = matchName(Object.keys(taxonomy), section);
  const unknownSection = !canonicalSection;
  if (!canonicalSection) {
    canonicalSection = qNo <= 50 ? 'General Awareness' : qNo <= 85 ? 'Mathematics' : 'General Intelligence and Reasoning';
  }
  const categories = Object.keys(taxonomy[canonicalSection]);
  const canonicalCategory = matchName(categories, category);
  if (!canonicalCategory) return { section: canonicalSection, category: 'Other', subcategory: 'Other', needsReview: true };
  const canonicalSubcategory = matchName(taxonomy[canonicalSection][canonicalCategory], subcategory);
  if (!canonicalSubcategory) return { section: canonicalSection, category: 'Other', subcategory: 'Other', needsReview: true };
  return { section: canonicalSection, category: canonicalCategory, subcategory: canonicalSubcategory, needsReview: unknownSection };
}
