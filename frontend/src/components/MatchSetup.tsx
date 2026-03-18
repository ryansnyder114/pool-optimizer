import React from "react";

interface MatchSetupProps {
  onLoadSample: () => void;
  isLoading: boolean;
  hasMatch: boolean;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({
  onLoadSample,
  isLoading,
  hasMatch,
}) => {
  if (hasMatch) {
    return null;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>APA Pool Matchup Optimizer</h2>
      <p style={styles.description}>
        Load a sample match to get started, or connect to your backend API.
      </p>
      <button
        style={styles.button}
        onClick={onLoadSample}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "Load Sample Match"}
      </button>
    </div>
  );
};

const styles = {
  container: {
    textAlign: "center" as const,
    padding: "60px 20px",
    backgroundColor: "#f5f5f5",
    borderRadius: "8px",
    marginBottom: "30px",
  },
  title: {
    margin: "0 0 15px 0",
    color: "#333",
    fontSize: "28px",
  },
  description: {
    margin: "0 0 25px 0",
    color: "#666",
    fontSize: "16px",
  },
  button: {
    padding: "15px 40px",
    fontSize: "18px",
    fontWeight: "bold" as const,
    color: "white",
    backgroundColor: "#28a745",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};
