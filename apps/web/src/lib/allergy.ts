// Función pura, SIN ningún import de servidor (nada de @pettapp/db) — a
// propósito, separada de emergency-fields-data.ts. Ese archivo importa el
// cliente de Postgres (para getEmergencyFields), y un componente "use
// client" que importe cualquier cosa de ahí arrastra todo ese módulo al
// bundle del navegador — incluido el cliente de Postgres, que depende de
// módulos de Node (net/tls/fs) que no existen en el browser y rompen el
// build. EmergencyCardEditor.tsx (client) importa esta función desde acá;
// page.tsx y emergency-fields-data.ts (ambos solo-servidor) la reexportan
// sin problema porque nunca se empaquetan para el navegador.
export function isAllergyLabel(label: string): boolean {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .includes("alerg");
}
