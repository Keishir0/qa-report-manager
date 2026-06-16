function readNestedValue(source: any, path: string[]) {
  return path.reduce((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return current[key];
  }, source);
}

function normalizeName(value: unknown) {
  if (typeof value === "string") return value.trim() || null;
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const name =
    record.nome ||
    record.name ||
    record.nomeUsuario ||
    record.nome_tecnico ||
    record.tecnico;

  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function getSndeskTechnicianName(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return null;

  const paths = [
    ["tecnico"],
    ["tecnico", "nome"],
    ["tecnico", "name"],
    ["tecnicoResponsavel"],
    ["tecnicoResponsavel", "nome"],
    ["responsavel"],
    ["responsavel", "nome"],
    ["responsavelTecnico"],
    ["responsavelTecnico", "nome"],
    ["dev"],
    ["dev", "nome"],
    ["desenvolvedor"],
    ["desenvolvedor", "nome"],
    ["atendente"],
    ["atendente", "nome"],
    ["usuarioTecnico"],
    ["usuarioTecnico", "nome"],
    ["assignedTo"],
    ["assignedTo", "name"],
    ["technician"],
    ["technician", "name"],
  ];

  for (const path of paths) {
    const name = normalizeName(readNestedValue(snapshot, path));
    if (name) return name;
  }

  return null;
}
