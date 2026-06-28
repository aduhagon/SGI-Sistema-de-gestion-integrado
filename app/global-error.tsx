"use client";

// Boundary de último recurso. A diferencia de error.tsx, éste captura
// errores ocurridos en el propio layout raíz, por lo que debe renderizar
// sus propias etiquetas <html> y <body>. Solo se activa en fallos graves.
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Algo salió mal
          </h1>
          <p style={{ color: "#6b7280", maxWidth: "28rem", marginBottom: "1.5rem" }}>
            Ocurrió un error inesperado al cargar la aplicación. Probá de nuevo.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: "2.5rem",
              padding: "0 1rem",
              borderRadius: "0.375rem",
              border: "none",
              background: "#111827",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
