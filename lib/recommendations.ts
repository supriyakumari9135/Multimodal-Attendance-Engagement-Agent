export interface TeachingRecommendation {
  title: string;
  explanation: string;
  evidence_json: Record<string, any>;
  suggested_action: string;
  confidence: number;
  supporting_metric: string;
}

export function evaluateSessionMetrics(
  timelineMetrics: Array<Record<string, any>>,
  durationMinutes: number,
  availableModalities: string[]
): TeachingRecommendation[] {
  const recommendations: TeachingRecommendation[] = [];

  if (!timelineMetrics || timelineMetrics.length === 0) {
    return recommendations;
  }

  // Rule 1: Missing Modality Sensor Check
  if (!availableModalities.includes("audio") && availableModalities.includes("video")) {
    recommendations.push({
      title: "Audio Modality Inactive",
      explanation: "Session dynamics are currently analyzed solely from visual indicators. Vocal exchange is unmonitored.",
      evidence_json: { missing: "audio", active: availableModalities },
      suggested_action: "If microphone access is desired and permitted, enable audio capture to gauge vocal exchange.",
      confidence: 0.95,
      supporting_metric: "sensor_availability"
    });
  }

  const pVals = timelineMetrics
    .map((m) => m.participation_activity)
    .filter((v): v is number => typeof v === "number");

  const mVals = timelineMetrics
    .map((m) => m.movement_patterns)
    .filter((v): v is number => typeof v === "number");

  const aVals = timelineMetrics
    .map((m) => m.audio_activity)
    .filter((v): v is number => typeof v === "number");

  // Rule 2: Sudden Participation Decline
  if (pVals.length >= 2) {
    for (let i = 1; i < pVals.length; i++) {
      const drop = pVals[i - 1] - pVals[i];
      if (drop >= 20.0) {
        const startMin = (i - 1) * 5;
        const endMin = i * 5;
        recommendations.push({
          title: "Participation Activity Decline Detected",
          explanation: `Observed participation indicator declined by ${Math.round(drop * 10) / 10}% between minutes ${startMin}:00 and ${endMin}:00.`,
          evidence_json: {
            time_interval: `${startMin}:00 - ${endMin}:00`,
            drop_percentage: Math.round(drop * 10) / 10,
            prior_value: pVals[i - 1],
            current_value: pVals[i]
          },
          suggested_action: "Consider introducing an open-ended prompt, polling question, or 2-minute think-pair-share exercise.",
          confidence: 0.88,
          supporting_metric: "participation_activity"
        });
        break; // one primary alert is sufficient
      }
    }
  }

  // Rule 3: Prolonged Low Physical Movement
  if (mVals.length >= 3) {
    const recentM = mVals.slice(-3);
    if (recentM.every((v) => v < 40.0)) {
      const avg = Math.round((recentM.reduce((a, b) => a + b, 0) / recentM.length) * 10) / 10;
      recommendations.push({
        title: "Extended Low Physical Movement",
        explanation: `A sustained 15-minute interval of low movement was recorded (avg: ${avg}%). Note: Students may be taking notes, reading quietly, or listening intently.`,
        evidence_json: { average_movement: avg, interval_minutes: 15 },
        suggested_action: "If this was an active lecture rather than silent reading, consider inviting students to stretch, write on the board, or stand for an activity.",
        confidence: 0.82,
        supporting_metric: "movement_patterns"
      });
    }
  }

  // Rule 4: Pacing & Synthesis Break
  if (durationMinutes >= 40.0) {
    recommendations.push({
      title: "Session Pacing: Review & Synthesis Break",
      explanation: `The session has reached ${Math.round(durationMinutes)} continuous minutes. Cognitive retention naturally declines after 40-45 minutes of continuous presentation.`,
      evidence_json: { session_duration_minutes: durationMinutes, recommended_break_cycle: 45 },
      suggested_action: "Conduct a 3-minute synthesis check-in or quick comprehension recap before proceeding to new content.",
      confidence: 0.90,
      supporting_metric: "session_duration"
    });
  }

  // Rule 5: Audio Monologue vs. Dialogue
  if (aVals.length >= 3) {
    const avgAudio = aVals.reduce((a, b) => a + b, 0) / aVals.length;
    if (avgAudio > 75.0 && aVals.length >= 4) {
      recommendations.push({
        title: "Extended Continuous Vocal Activity",
        explanation: "Continuous vocal activity has persisted at high levels without conversational pauses.",
        evidence_json: { average_audio_activity: Math.round(avgAudio * 10) / 10 },
        suggested_action: "Pause for 30-60 seconds of silent reflection to allow students to digest complex points and formulate questions.",
        confidence: 0.85,
        supporting_metric: "audio_activity"
      });
    } else if (avgAudio < 25.0) {
      recommendations.push({
        title: "Low Classroom Audio Activity",
        explanation: "Classroom audio level has remained low. This appropriately reflects independent study, exam, or writing phases.",
        evidence_json: { average_audio_activity: Math.round(avgAudio * 10) / 10 },
        suggested_action: "If interactive discussion was planned for this segment, prompt a designated study group or call for volunteer questions.",
        confidence: 0.84,
        supporting_metric: "audio_activity"
      });
    }
  }

  return recommendations;
}

