"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: "#ffffff",
          color: "#000000",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          Algo deu errado
        </h1>
        <p style={{ color: "#71717a", fontSize: "0.875rem", maxWidth: "28rem", lineHeight: 1.7 }}>
          Ocorreu um erro inesperado ao carregar a aplicação. Tente novamente.
        </p>
        {error.digest && (
          <p style={{ color: "#a1a1aa", fontSize: "0.6875rem", fontFamily: "monospace" }}>
            Ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: "1rem",
            padding: "1rem 2rem",
            backgroundColor: "#000000",
            color: "#ffffff",
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
