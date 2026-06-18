// src/components/SystemDiagram.tsx
import React from "react";

export interface SystemDiagramProps {
  /** Optional title displayed above the diagram */
  title?: string;
  /** Optional brief description */
  description?: string;
}

/**
 * Simplified SystemDiagram component.
 * Replaces the previous complex TeleJS‑based implementation with a lightweight placeholder.
 */
export const SystemDiagram: React.FC<SystemDiagramProps> = ({ title = "System Diagram", description }) => {
  return (
    <section className="system-diagram" style={containerStyle}>
      <h2 style={titleStyle}>{title}</h2>
      {description && <p style={descStyle}>{description}</p>}
      <div style={placeholderStyle}>[Diagram Placeholder]</div>
    </section>
  );
};

// Quick inline styling – feel free to move to a CSS module later.
const containerStyle: React.CSSProperties = {
  padding: "1rem",
  borderRadius: "0.75rem",
  background: "var(--bg-card, #f5f5f5)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  textAlign: "center",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.5rem",
  color: "var(--text-primary, #222)",
};

const descStyle: React.CSSProperties = {
  margin: "0.5rem 0 1rem",
  color: "var(--text-secondary, #555)",
  fontSize: "0.95rem",
};

const placeholderStyle: React.CSSProperties = {
  height: "200px",
  border: "2px dashed var(--accent, #0077ff)",
  borderRadius: "0.5rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--accent, #0077ff)",
  fontStyle: "italic",
};
