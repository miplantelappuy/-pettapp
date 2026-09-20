"use client";

export function PrintButton() {
  return (
    <button type="button" className="glassButton" onClick={() => window.print()}>
      🖨️ Imprimir / guardar como PDF
    </button>
  );
}
