export const DEFAULT_WEIGHTS: Record<string, number> = {
  participation_activity: 0.35,
  movement_patterns: 0.25,
  head_orientation: 0.20,
  audio_activity: 0.20
};

export interface EngagementResult {
  score: number | null;
  status: string;
  confidence: number;
  available_modalities: string[];
  renormalized_weights: Record<string, number>;
  contributions: Record<string, number>;
  explanation: string;
  limitation_note: string;
}

export function calculateExplainableEngagement(
  metricsByModality: Record<string, number | null | undefined>,
  customWeights?: Record<string, number>
): EngagementResult {
  const baseWeights = customWeights || DEFAULT_WEIGHTS;
  const available: Record<string, number> = {};

  for (const [key, val] of Object.entries(metricsByModality)) {
    if (val !== null && val !== undefined && baseWeights[key] !== undefined) {
      available[key] = Math.max(0, Math.min(100, Number(val)));
    }
  }

  const availableKeys = Object.keys(available);
  if (availableKeys.length === 0) {
    return {
      score: null,
      status: "Insufficient data",
      confidence: 0.0,
      available_modalities: [],
      renormalized_weights: {},
      contributions: {},
      explanation: "No active sensor or observation signals currently detected.",
      limitation_note: "Physical indicators are proxies, not absolute proof of attention or learning."
    };
  }

  // Renormalize weights strictly over active modalities
  let weightSum = 0;
  for (const k of availableKeys) {
    weightSum += baseWeights[k] || 0.25;
  }
  if (weightSum <= 0) weightSum = 1.0;

  const renormalizedWeights: Record<string, number> = {};
  const contributions: Record<string, number> = {};
  let totalScore = 0;

  for (const k of availableKeys) {
    const rw = (baseWeights[k] || 0.25) / weightSum;
    renormalizedWeights[k] = Math.round(rw * 1000) / 1000;
    const contrib = available[k] * rw;
    contributions[k] = Math.round(contrib * 10) / 10;
    totalScore += contrib;
  }

  const finalScore = Math.round(totalScore * 10) / 10;
  const coverageRatio = availableKeys.length / Object.keys(baseWeights).length;
  const confidence = Math.round(Math.min(0.98, Math.max(0.45, coverageRatio * 0.95)) * 100) / 100;

  return {
    score: finalScore,
    status: coverageRatio >= 0.5 ? "Calculated" : "Partial data",
    confidence,
    available_modalities: availableKeys,
    renormalized_weights: renormalizedWeights,
    contributions,
    explanation: `Calculated from ${availableKeys.length} verified observation modalities.`,
    limitation_note:
      "Physical indicators are proxies, not direct measures of comprehension. Low physical movement may indicate quiet, focused reading or note-taking."
  };
}

export function detectSignificantShifts(
  timelineRecords: Array<{
    interval_label: string;
    participation_activity?: number | null;
    [key: string]: any;
  }>,
  threshold: number = 15.0
): Array<{
  interval: string;
  metric: string;
  change: number;
  wording: string;
  evidence: Record<string, any>;
  confidence: number;
  limitation: string;
}> {
  const insights: Array<any> = [];
  if (timelineRecords.length < 2) return insights;

  for (let i = 1; i < timelineRecords.length; i++) {
    const prev = timelineRecords[i - 1];
    const curr = timelineRecords[i];

    const prevP = prev.participation_activity;
    const currP = curr.participation_activity;

    if (prevP !== null && prevP !== undefined && currP !== null && currP !== undefined) {
      const diff = Math.round((currP - prevP) * 10) / 10;
      if (Math.abs(diff) >= threshold) {
        const direction = diff > 0 ? "increased" : "decreased";
        const tFrom = prev.interval_label || `Interval ${i}`;
        const tTo = curr.interval_label || `Interval ${i + 1}`;

        insights.push({
          interval: `${tFrom} to ${tTo}`,
          metric: "participation_activity",
          change: diff,
          wording: `Participation activity ${direction} by ${Math.abs(diff)}% during this interval.`,
          evidence: {
            prior_value: prevP,
            current_value: currP,
            source_modality: "video"
          },
          confidence: 0.88,
          limitation: "External classroom shifts, quiet writing, or topic changes may account for variations."
        });
      }
    }
  }

  return insights;
}
