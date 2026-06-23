/**
 * EU TRACES DDS Submission Service
 *
 * Formats OriginTrace platform data into the IMSOC/TRACES API payload format
 * as defined in Commission Implementing Regulation (EU) 2023/1579.
 *
 * MVP workflow:
 *   mode='download' — Returns TRACES-formatted JSON for manual upload to TRACES portal.
 *                     Sets prenotif_eu_traces = 'filed' on the shipment.
 *   mode='api'      — Submits directly to TRACES API when EC credentials are configured.
 *                     Not available until EC registration is approved (4–8 week process).
 *
 * EU TRACES API (IMSOC): uses OAuth 2.0 with org-level credentials registered with DG SANTE.
 * DDS payload format: Commission Implementing Regulation (EU) 2023/1579 Annex II.
 *
 * Registration note: Submit the TRACES API operator registration at:
 * https://webgate.ec.europa.eu/tracesnt/login
 * The process requires an SSL certificate and EU TRACES operator account (separate from API access).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TracesFarmPlot {
  plotId: string;
  country: string;         // ISO 3166-1 alpha-2, e.g. 'NG'
  areaHectares: number;
  geoJson: Record<string, unknown>; // GeoJSON Polygon
  deforestationFree: boolean;
  productionStartDate?: string; // ISO date — must be post-2020-12-31 for EUDR
}

export interface TracesOperator {
  name: string;
  identifier: string;       // Organisation ID / slug
  country: string;          // Country of establishment
  contactEmail?: string;
}

export interface TracesDdsPayload {
  /** IMSOC document type identifier */
  documentType: 'EUDR_DUE_DILIGENCE_STATEMENT';
  /** Payload format version */
  version: '2023/1579';
  /** Platform-generated reference (replaced by TRACES reference after submission) */
  draftReferenceNumber: string;
  generatedAt: string;

  operator: TracesOperator;

  commodity: {
    hsCode: string;          // e.g. '1801.00' for cocoa beans
    description: string;
    scientificName?: string; // e.g. 'Theobroma cacao'
    quantity: number;
    unit: 'kg' | 'tonnes';
    countryOfOrigin: string; // ISO 3166-1 alpha-2
  };

  supplyChain: {
    farmerCount: number;
    plots: TracesFarmPlot[];
    lotIds: string[];
    productionPeriod: {
      from: string; // ISO date
      to: string;   // ISO date
    };
  };

  deforestationDeclaration: {
    statement: string;
    deforestationFreePercentage: number;
    checkDate: string;
    dataSource: string;
  };

  legalityDeclaration: {
    statement: string;
    countryLaws: string[];
  };

  shipment?: {
    shipmentId: string;
    destinationCountry: string;
    estimatedArrival?: string;
    billOfLadingNumber?: string;
  };
}

export interface TracesFarm {
  id: string;
  boundary: Record<string, unknown> | null;
  boundary_geo: unknown | null;
  area_hectares: number | null;
  compliance_status: string;
  deforestation_check: {
    risk_level?: string | null;
    check_date?: string | null;
    data_source?: string | null;
  } | null;
  community: string;
  commodity?: string | null;
  consent_timestamp: string | null;
}

export interface TracesShipment {
  id: string;
  destination_country: string | null;
  eta: string | null;
  bill_of_lading_number: string | null;
  total_weight_kg: number | null;
}

export interface TracesOrg {
  name: string;
  slug: string;
  settings?: Record<string, unknown> | null;
}

// ─── HS code lookup for common Nigerian export commodities ────────────────────

const COMMODITY_HS_CODES: Record<string, { hs: string; description: string; scientific: string }> = {
  cocoa:     { hs: '1801.00', description: 'Cocoa beans, whole or broken, raw or roasted', scientific: 'Theobroma cacao' },
  ginger:    { hs: '0910.11', description: 'Ginger, neither crushed nor ground', scientific: 'Zingiber officinale' },
  cashew:    { hs: '0801.31', description: 'Cashew nuts, in shell, fresh or dried', scientific: 'Anacardium occidentale' },
  hibiscus:  { hs: '1211.90', description: 'Plants and parts of plants used in perfumery — hibiscus', scientific: 'Hibiscus sabdariffa' },
  sesame:    { hs: '1207.40', description: 'Sesame seeds, whether or not broken', scientific: 'Sesamum indicum' },
  'palm oil':{ hs: '1511.10', description: 'Palm oil, crude', scientific: 'Elaeis guineensis' },
};

// ─── Payload formatter ────────────────────────────────────────────────────────

/**
 * Formats OriginTrace data into a TRACES API-compatible DDS payload.
 * This is the IMSOC format defined in EU Implementing Regulation 2023/1579.
 */
export function formatTracesPayload(
  org: TracesOrg,
  shipment: TracesShipment,
  farms: TracesFarm[],
  lotIds: string[],
  commodity: string
): TracesDdsPayload {
  const hsInfo = COMMODITY_HS_CODES[commodity.toLowerCase()] ?? {
    hs: '0000.00',
    description: commodity,
    scientific: undefined,
  };

  const eligibleFarms = farms.filter(
    (f) => f.compliance_status === 'approved' && f.boundary !== null
  );

  const plots: TracesFarmPlot[] = eligibleFarms.map((f) => ({
    plotId: f.id,
    country: 'NG', // Nigeria — derive from org settings if multi-country
    areaHectares: f.area_hectares ?? 0,
    geoJson: (f.boundary as Record<string, unknown>) ?? {},
    deforestationFree: f.deforestation_check?.risk_level !== 'failed' &&
                       f.deforestation_check?.risk_level !== 'high',
    productionStartDate: '2021-01-01', // Post-EUDR cutoff default; refine with actual data
  }));

  const deforestationFreeCount = plots.filter((p) => p.deforestationFree).length;
  const deforestationFreePercentage =
    plots.length > 0 ? Math.round((deforestationFreeCount / plots.length) * 100) : 0;

  const checkDates = farms
    .map((f) => f.deforestation_check?.check_date)
    .filter(Boolean)
    .sort();
  const latestCheckDate = checkDates[checkDates.length - 1] ?? new Date().toISOString().split('T')[0];

  const dataSources = [...new Set(
    farms
      .map((f) => f.deforestation_check?.data_source)
      .filter(Boolean)
  )];

  const draftRef = `OT-DDS-${org.slug.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  return {
    documentType: 'EUDR_DUE_DILIGENCE_STATEMENT',
    version: '2023/1579',
    draftReferenceNumber: draftRef,
    generatedAt: new Date().toISOString(),

    operator: {
      name: org.name,
      identifier: org.slug,
      country: 'NG',
      contactEmail: (org.settings as any)?.contact_email ?? undefined,
    },

    commodity: {
      hsCode: hsInfo.hs,
      description: hsInfo.description,
      scientificName: hsInfo.scientific,
      quantity: shipment.total_weight_kg ?? 0,
      unit: 'kg',
      countryOfOrigin: 'NG',
    },

    supplyChain: {
      farmerCount: farms.length,
      plots,
      lotIds,
      productionPeriod: {
        from: '2021-01-01',
        to: new Date().toISOString().split('T')[0],
      },
    },

    deforestationDeclaration: {
      statement:
        'The operator declares that the commodity described in this Due Diligence Statement ' +
        'has been produced on land that was not subject to deforestation or forest degradation ' +
        'after 31 December 2020, in accordance with Article 3 of Regulation (EU) 2023/1115.',
      deforestationFreePercentage,
      checkDate: latestCheckDate,
      dataSource: dataSources.join(', ') || 'Satelligence / manual GPS verification',
    },

    legalityDeclaration: {
      statement:
        'The operator declares that the commodity has been produced in accordance with the ' +
        'relevant legislation of the country of production, including laws on land use rights, ' +
        'environmental protection, and labour rights.',
      countryLaws: [
        'Nigeria Land Use Act 1978',
        'Nigeria Environmental Impact Assessment Act 1992',
        'Nigeria Labour Act Cap L1 LFN 2004',
      ],
    },

    shipment: shipment.id
      ? {
          shipmentId: shipment.id,
          destinationCountry: shipment.destination_country ?? 'EU',
          estimatedArrival: shipment.eta ?? undefined,
          billOfLadingNumber: shipment.bill_of_lading_number ?? undefined,
        }
      : undefined,
  };
}

// ─── Submission function (MVP: download; V2: live TRACES API) ─────────────────

export interface TracesSubmissionResult {
  status: 'downloaded' | 'submitted' | 'reference_recorded' | 'failed';
  referenceNumber?: string;
  draftReferenceNumber: string;
  error?: string;
}

/**
 * Submit DDS to EU TRACES.
 *
 * In MVP: 'download' mode returns the formatted payload for manual submission.
 * When EC registration is approved, 'api' mode will POST directly to IMSOC.
 */
export async function submitToTraces(
  payload: TracesDdsPayload,
  mode: 'download' | 'api' = 'download',
  _credentials?: { clientId: string; clientSecret: string; tracesEnv: 'sandbox' | 'production' }
): Promise<TracesSubmissionResult> {
  if (mode === 'download') {
    // MVP: caller downloads the payload JSON file and submits manually to TRACES portal.
    return {
      status: 'downloaded',
      draftReferenceNumber: payload.draftReferenceNumber,
    };
  }

  // Live TRACES API — available once EC registration is approved.
  // TODO: implement OAuth 2.0 token fetch + IMSOC POST when credentials are available.
  return {
    status: 'failed',
    draftReferenceNumber: payload.draftReferenceNumber,
    error:
      'EU TRACES API submission is not yet available. EC registration is pending (4–8 weeks). ' +
      'Use mode="download" to get the formatted DDS file for manual submission to the TRACES portal.',
  };
}
