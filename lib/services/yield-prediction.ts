import { createAdminClient } from '@/lib/supabase/admin';

export interface YieldPredictionFactors {
  label: string;
  value: string;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface YieldPredictionResult {
  predictedYieldKg: number;
  confidenceRange: { low: number; high: number };
  factors: YieldPredictionFactors[];
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
  seasonalData?: { season: string; yieldKg: number }[];
}

interface SeasonBucket {
  label: string;
  totalKg: number;
}

function getSeasonLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth();
  const year = d.getFullYear();
  if (month < 3) return `${year} Q1`;
  if (month < 6) return `${year} Q2`;
  if (month < 9) return `${year} Q3`;
  return `${year} Q4`;
}

function getMonthSeasonality(country?: string): number {
  const month = new Date().getMonth();
  if (month >= 9 && month <= 11) return 1.15;
  if (month >= 3 && month <= 5) return 0.85;
  return 1.0;
}

export async function predictYield(
  farmId: string,
  commodity: string,
  orgId: string,
  season?: string
): Promise<YieldPredictionResult> {
  const supabase = createAdminClient();

  const [farmRes, batchesRes, inputsRes, benchmarkRes, certsRes] = await Promise.all([
    supabase
      .from('farms')
      .select('area_hectares, community, commodity, compliance_status')
      .eq('id', farmId)
      .single(),
    supabase
      .from('collection_batches')
      .select('total_weight_kg, total_weight, collection_date, collected_at, created_at, commodity')
      .eq('farm_id', farmId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('farmer_inputs')
      .select('input_type, quantity, unit, area_applied_hectares, application_date')
      .eq('farm_id', farmId)
      .order('application_date', { ascending: false })
      .limit(50),
    supabase
      .from('yield_benchmarks')
      .select('avg_yield_per_hectare, min_yield, max_yield, country, region')
      .ilike('commodity', `%${commodity}%`)
      .limit(10),
    supabase
      .from('farm_certifications')
      .select('certification_body, status')
      .eq('farm_id', farmId)
      .eq('status', 'active'),
  ]);

  const farm = farmRes.data;
  const batches = batchesRes.data || [];
  const inputs = inputsRes.data || [];
  const benchmarks = benchmarkRes.data || [];
  const certifications = certsRes.data || [];
  const areaHa = farm?.area_hectares || 1;

  const factors: YieldPredictionFactors[] = [];
  const recommendations: string[] = [];

  const seasonBuckets: Record<string, number> = {};
  for (const b of batches) {
    const dateStr = b.collection_date || b.collected_at || b.created_at;
    if (!dateStr) continue;
    const key = getSeasonLabel(dateStr);
    const weight = b.total_weight_kg || b.total_weight || 0;
    seasonBuckets[key] = (seasonBuckets[key] || 0) + Number(weight);
  }

  const sortedSeasons = Object.entries(seasonBuckets)
    .map(([label, totalKg]) => ({ label, totalKg }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const recentSeasons = sortedSeasons.slice(-3);

  let historicalAvgPerHa = 0;
  let trend: 'improving' | 'stable' | 'declining' = 'stable';

  if (recentSeasons.length > 0) {
    const weights = recentSeasons.map((s, i) => {
      const w = i === recentSeasons.length - 1 ? 3 : i === recentSeasons.length - 2 ? 2 : 1;
      return { yieldPerHa: s.totalKg / areaHa, weight: w };
    });
    const totalW = weights.reduce((s, w) => s + w.weight, 0);
    historicalAvgPerHa = weights.reduce((s, w) => s + w.yieldPerHa * w.weight, 0) / totalW;

    factors.push({
      label: 'Historical yield (weighted avg)',
      value: `${Math.round(historicalAvgPerHa)} kg/ha over ${recentSeasons.length} season(s)`,
      impact: historicalAvgPerHa > 0 ? 'positive' : 'neutral',
    });

    if (recentSeasons.length >= 2) {
      const prev = recentSeasons[recentSeasons.length - 2].totalKg / areaHa;
      const latest = recentSeasons[recentSeasons.length - 1].totalKg / areaHa;
      const change = prev > 0 ? ((latest - prev) / prev) * 100 : 0;
      if (change > 10) trend = 'improving';
      else if (change < -10) trend = 'declining';
    }
  }

  let benchmarkAvgPerHa = 0;
  if (benchmarks.length > 0) {
    benchmarkAvgPerHa = benchmarks.reduce((s, b) => s + Number(b.avg_yield_per_hectare || 0), 0) / benchmarks.length;
    const benchmarkTonsToKg = benchmarkAvgPerHa < 10 ? benchmarkAvgPerHa * 1000 : benchmarkAvgPerHa;
    benchmarkAvgPerHa = benchmarkTonsToKg;
    factors.push({
      label: 'Regional benchmark',
      value: `${Math.round(benchmarkAvgPerHa)} kg/ha`,
      impact: 'neutral',
    });
  }

  let inputMultiplier = 1.0;
  const fertilizerInputs = inputs.filter(i => i.input_type === 'fertilizer');
  const pesticideInputs = inputs.filter(i => i.input_type === 'pesticide');

  if (fertilizerInputs.length > 0) {
    inputMultiplier += 0.05;
    factors.push({
      label: 'Fertilizer application',
      value: `${fertilizerInputs.length} application(s) recorded`,
      impact: 'positive',
    });
  } else {
    inputMultiplier -= 0.05;
    recommendations.push('Consider applying fertilizer based on soil analysis to improve yields');
    factors.push({
      label: 'Fertilizer application',
      value: 'No recent fertilizer records',
      impact: 'negative',
    });
  }

  if (pesticideInputs.length > 0) {
    inputMultiplier += 0.03;
    factors.push({
      label: 'Pest management',
      value: `${pesticideInputs.length} treatment(s) recorded`,
      impact: 'positive',
    });
  }

  let certMultiplier = 1.0;
  if (certifications.length > 0) {
    certMultiplier = 1.08;
    factors.push({
      label: 'Active certifications',
      value: `${certifications.length} active certification(s)`,
      impact: 'positive',
    });
  } else {
    factors.push({
      label: 'Certifications',
      value: 'No active certifications',
      impact: 'neutral',
    });
  }

  const seasonalityFactor = getMonthSeasonality();
  factors.push({
    label: 'Seasonal adjustment',
    value: seasonalityFactor > 1 ? 'Peak season (+)' : seasonalityFactor < 1 ? 'Off-season (-)' : 'Mid-season',
    impact: seasonalityFactor > 1 ? 'positive' : seasonalityFactor < 1 ? 'negative' : 'neutral',
  });

  factors.push({
    label: 'Farm area',
    value: `${areaHa} hectares`,
    impact: 'neutral',
  });

  let baseYieldPerHa: number;
  if (historicalAvgPerHa > 0 && benchmarkAvgPerHa > 0) {
    baseYieldPerHa = historicalAvgPerHa * 0.7 + benchmarkAvgPerHa * 0.3;
  } else if (historicalAvgPerHa > 0) {
    baseYieldPerHa = historicalAvgPerHa;
  } else if (benchmarkAvgPerHa > 0) {
    baseYieldPerHa = benchmarkAvgPerHa;
  } else {
    baseYieldPerHa = 400;
  }

  const adjustedYieldPerHa = baseYieldPerHa * inputMultiplier * certMultiplier * seasonalityFactor;
  const predictedYieldKg = Math.round(adjustedYieldPerHa * areaHa);

  const confidenceMultiplier = recentSeasons.length >= 3 ? 0.15 : recentSeasons.length >= 1 ? 0.25 : 0.35;
  const confidenceRange = {
    low: Math.round(predictedYieldKg * (1 - confidenceMultiplier)),
    high: Math.round(predictedYieldKg * (1 + confidenceMultiplier)),
  };

  if (trend === 'declining') {
    recommendations.push('Yield trend is declining. Consider enrolling in Good Agricultural Practices (GAP) training');
  }

  if (areaHa > 2 && inputs.length < 3) {
    recommendations.push('Farm area appears underutilized relative to input application. Consider an expansion assessment');
  }

  if (certifications.length === 0) {
    recommendations.push('Pursue certification (e.g., Rainforest Alliance) to access premium markets and improve practices');
  }

  return {
    predictedYieldKg,
    confidenceRange,
    factors,
    trend,
    recommendations,
    seasonalData: sortedSeasons.map(s => ({ season: s.label, yieldKg: Math.round(s.totalKg) })),
  };
}

export async function predictYieldForOrg(orgId: string): Promise<{
  predictions: Array<{
    farmId: string;
    farmerName: string;
    commodity: string;
    areaHa: number;
    predictedYieldKg: number;
    confidenceRange: { low: number; high: number };
    trend: 'improving' | 'stable' | 'declining';
    risk: 'low' | 'medium' | 'high';
  }>;
  commoditySummary: Record<string, {
    totalPredictedKg: number;
    farmCount: number;
    avgYieldPerHa: number;
    atRiskCount: number;
  }>;
}> {
  const supabase = createAdminClient();

  const { data: farms } = await supabase
    .from('farms')
    .select('id, farmer_name, commodity, area_hectares, compliance_status')
    .eq('org_id', orgId)
    .not('area_hectares', 'is', null)
    .limit(200);

  if (!farms || farms.length === 0) {
    return { predictions: [], commoditySummary: {} };
  }

  const predictions: Array<{
    farmId: string;
    farmerName: string;
    commodity: string;
    areaHa: number;
    predictedYieldKg: number;
    confidenceRange: { low: number; high: number };
    trend: 'improving' | 'stable' | 'declining';
    risk: 'low' | 'medium' | 'high';
  }> = [];

  const batchSize = 20;
  for (let i = 0; i < farms.length; i += batchSize) {
    const batch = farms.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (farm) => {
        try {
          const prediction = await predictYield(
            farm.id,
            farm.commodity || 'cocoa',
            orgId
          );

          let risk: 'low' | 'medium' | 'high' = 'low';
          if (prediction.trend === 'declining') risk = 'high';
          else if (prediction.confidenceRange.high - prediction.confidenceRange.low > prediction.predictedYieldKg * 0.5) risk = 'medium';

          return {
            farmId: farm.id,
            farmerName: farm.farmer_name,
            commodity: farm.commodity || 'cocoa',
            areaHa: Number(farm.area_hectares) || 0,
            predictedYieldKg: prediction.predictedYieldKg,
            confidenceRange: prediction.confidenceRange,
            trend: prediction.trend,
            risk,
          };
        } catch {
          return null;
        }
      })
    );
    predictions.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));
  }

  const commoditySummary: Record<string, {
    totalPredictedKg: number;
    farmCount: number;
    avgYieldPerHa: number;
    atRiskCount: number;
  }> = {};

  for (const p of predictions) {
    const key = p.commodity.toLowerCase();
    if (!commoditySummary[key]) {
      commoditySummary[key] = { totalPredictedKg: 0, farmCount: 0, avgYieldPerHa: 0, atRiskCount: 0 };
    }
    commoditySummary[key].totalPredictedKg += p.predictedYieldKg;
    commoditySummary[key].farmCount += 1;
    if (p.risk === 'high') commoditySummary[key].atRiskCount += 1;
  }

  for (const key of Object.keys(commoditySummary)) {
    const s = commoditySummary[key];
    const totalArea = predictions.filter(p => p.commodity.toLowerCase() === key).reduce((sum, p) => sum + p.areaHa, 0);
    s.avgYieldPerHa = totalArea > 0 ? Math.round(s.totalPredictedKg / totalArea) : 0;
  }

  return { predictions, commoditySummary };
}

export function checkPredictionExceedance(
  actualWeightKg: number,
  predictedYieldKg: number
): { exceeded: boolean; percentageOver: number } {
  if (predictedYieldKg <= 0) return { exceeded: false, percentageOver: 0 };
  const percentageOver = ((actualWeightKg - predictedYieldKg) / predictedYieldKg) * 100;
  return {
    exceeded: percentageOver > 200,
    percentageOver: Math.round(percentageOver),
  };
}
