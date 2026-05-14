export interface SourceOption {
  value: string;
  label: string;
}

export interface SourceGroup {
  label: string;
  options: SourceOption[];
}

export const PITTSBURGH_SOURCE_GROUPS: SourceGroup[] = [
  {
    label: 'Federal + State',
    options: [
      { value: 'federal_samgov', label: 'SAM.gov (Pittsburgh-area + national)' },
      { value: 'state_pa_emarketplace', label: 'PA eMarketplace' },
      { value: 'state_pa_treasury', label: 'PA Treasury' },
      { value: 'state_pa_bulletin', label: 'PA Bulletin' },
      { value: 'state_pa_dced', label: 'PA DCED' },
    ],
  },
  {
    label: 'Local Government',
    options: [
      { value: 'local_pittsburgh', label: 'City of Pittsburgh' },
      { value: 'local_allegheny', label: 'Allegheny County' },
      { value: 'local_ura', label: 'Urban Redevelopment Authority' },
      { value: 'local_housing_authority', label: 'Housing Authority of Pittsburgh' },
      { value: 'local_prt', label: 'Pittsburgh Regional Transit' },
      { value: 'local_pwsa', label: 'Pittsburgh Water' },
      { value: 'local_ppa', label: 'Pittsburgh Parking Authority' },
      { value: 'local_sea', label: 'Sports & Exhibition Authority' },
      { value: 'local_alcosan', label: 'ALCOSAN' },
      { value: 'local_airport_authority', label: 'Airport Authority' },
    ],
  },
  {
    label: 'Higher Education',
    options: [
      { value: 'education_pitt', label: 'University of Pittsburgh' },
      { value: 'education_cmu', label: 'Carnegie Mellon' },
      { value: 'education_ccac', label: 'CCAC' },
      { value: 'education_pgh_schools', label: 'Pittsburgh Public Schools' },
      { value: 'education_duquesne', label: 'Duquesne University' },
    ],
  },
];

export const AI_OPPORTUNITY_TERMS = [
  'artificial intelligence',
  'machine learning',
  'generative ai',
  'genai',
  'large language model',
  'llm',
  'chatbot',
  'copilot',
  'computer vision',
  'predictive analytics',
  'intelligent automation',
  'document intelligence',
  'ocr',
  'data labeling',
  'natural language processing',
  'nlp',
  'autonomous system',
  'ai governance',
  'responsible ai',
  'anomaly detection',
  'ai cybersecurity',
];

export function aiOpportunityClauses(columns: string[] = ['title', 'description']): string[] {
  return AI_OPPORTUNITY_TERMS.flatMap((term) =>
    columns.map((column) => `${column}.ilike.%${term}%`),
  );
}

export function isAiOpportunityText(...parts: Array<string | null | undefined>): boolean {
  const haystack = parts.filter(Boolean).join(' ').toLowerCase();
  return AI_OPPORTUNITY_TERMS.some((term) => haystack.includes(term));
}
