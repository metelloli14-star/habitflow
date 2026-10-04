import { personalDataConsent } from './personal-data-consent';
import { privacyPolicy } from './privacy-policy';
import { termsOfUse } from './terms';
import type { LegalDocument } from './types';

export { OPERATOR, LEGAL_UPDATED_AT } from './operator';
export type { LegalBlock, LegalDocument, LegalSection } from './types';

/** Documents by slug: shown on the website at /legal/<slug> and inside the app at /documents/<slug>. */
export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  'privacy-policy': privacyPolicy,
  'personal-data': personalDataConsent,
  terms: termsOfUse,
};
