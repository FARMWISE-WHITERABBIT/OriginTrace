import { post as chineGacc } from './china-gacc-deadline-june-2026';
import { post as eudrCocoa } from './eudr-compliance-tools-cocoa-exporters';
import { post as eudrHerbs } from './eudr-compliance-tools-herbs-spices-exporters';
import { post as eudrCocoaImporters } from './eudr-cocoa-compliance-importers-readiness-guide';
import { post as eudrHerbsImporters } from './eudr-herbs-spices-compliance-importers-readiness-guide';
import { post as sesame } from './sesame-seed-export-compliance-guide';
import { post as soybean } from './soybean-eudr-export-compliance-guide';
import { post as preShipment } from './pre-shipment-compliance-scoring';
import { post as eudrDeadline } from './eudr-compliance-deadline-2026-exporters';
import { post as offline } from './offline-first-traceability-low-connectivity';
import type { BlogPost } from '@/lib/blog';

export const posts: BlogPost[] = [
  chineGacc,
  eudrCocoa,
  eudrHerbs,
  eudrCocoaImporters,
  eudrHerbsImporters,
  sesame,
  soybean,
  preShipment,
  eudrDeadline,
  offline,
];
