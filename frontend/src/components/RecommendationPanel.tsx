import React, { useState } from "react";

interface Recommendation {
  player: any;
  value: number;
  confidence: "high" | "medium" | "low";
  explanation: {
    summary: string;
    legality: string;
    future_flexibility: string;
    strategy: string;
  };
}

interface RecommendationPanelProps {
  title: string;
  recommendations: Recommendation[];
  showValue?: boolean;
  onSelectPlayer?: (rec: Recommendation) => void;
  selectedPlayerId?: string | null;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  title,
  recommendations,
  showValue = true,
  onSelectPlayer,
  selectedPlayerId,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (recommendations.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.noData}>No recommendations available</p>
      </div>
    );
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "#28a745";
      case "medium":
        return "#ffc107";
      case "low":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getConfidenceBg = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "#d4edda";
      case "medium":
        return "#fff3cd";
      case "low":
        return "#f8d7da";
      default:
        return "#f8f9fa";
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{title}</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>#</th>
            <th style={styles.th}>Player</th>
            <th style={styles.th}>SL</th>
            {showValue && <th style={styles.th}>Value</th>}
            <th style={styles.th}>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {recommendations.map((rec, index) => {
            const isExpanded = expandedId === rec.player.id;
            const isSelected = selectedPlayerId === rec.player.id;

            return (
              <React.Fragment key={rec.player.id}>
                <tr
                  style={{
                    ...styles.row,
                    backgroundColor: isSelected ? "#d4edda" : index === 0 ? "#fff" : "white",
                  }}
                >
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.td}>
                    {rec.player.name}
                    {index === 0 && " ★"}
                  </td>
                  <td style={styles.td}>{rec.player.skill_level}</td>
                  {showValue && (
                    <td style={styles.td}>
                      {typeof rec.value === "number" ? rec.value.toFixed(2) : rec.value}
                    </td>
                  )}
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.confidenceBadge,
                        backgroundColor: getConfidenceBg(rec.confidence),
                        color: rec.confidence === "medium" ? "#000" : getConfidenceColor(rec.confidence),
                      }}
                    >
                      {rec.confidence.toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} style={styles.expandedCell}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : rec.player.id)}
                      style={styles.expandButton}
                    >
                      {isExpanded ? "▼ Hide details" : "▶ Show details"}
                    </button>
                    {isExpanded && (
                      <div style={styles.explanationBox}>
                        <div style={styles.explanationSection}>
                          <strong>📋 Summary:</strong> {rec.explanation.summary}
                        </div>
                        <div style={styles.explanationSection}>
                          <strong>⚖️ Legality:</strong> {rec.explanation.legality}
                        </div>
                        <div style={styles.explanationSection}>
                          <strong>🔮 Future:</strong> {rec.explanation.future_flexibility}
                        </div>
                        <div style={styles.explanationSection}>
                          <strong>🎯 Strategy:</strong> {rec.explanation.strategy}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  container: {
    marginBottom: "20px",
    padding: "15px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fff",
  },
  title: {
    margin: "0 0 10px 0",
    color: "#333",
  },
  noData: {
    color: "#666",
    fontStyle: "italic",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "14px",
  },
  th: {
    textAlign: "left" as const,
    padding: "8px",
    borderBottom: "2px solid #ddd",
    backgroundColor: "#f5f5f5",
  },
  td: {
    padding: "8px",
    borderBottom: "1px solid #eee",
  },
  row: {
    transition: "background-color 0.2s",
  },
  confidenceBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "bold" as const,
  },
  expandedCell: {
    padding: "0",
    backgroundColor: "#f9f9f9",
  },
  expandButton: {
    width: "100%",
    padding: "8px",
    textAlign: "left" as const,
    background: "none",
    border: "none",
    color: "#007bff",
    cursor: "pointer",
    fontSize: "13px",
  },
  explanationBox: {
    padding: "15px",
    backgroundColor: "white",
    borderTop: "1px solid #eee",
  },
  explanationSection: {
    marginBottom: "8px",
    fontSize: "13px",
    lineHeight: "1.4",
  },
};
