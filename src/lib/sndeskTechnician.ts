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

function normalizeId(value: unknown): string | null {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim() || null;
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const id =
    record.idusuario ||
    record.id ||
    record.iduser ||
    record.idtecnico ||
    record.id_tecnico ||
    record.id_usuario;

  if (typeof id === "number") return String(id);
  if (typeof id === "string" && id.trim()) return id.trim();
  return null;
}

export function getSndeskTechnicianId(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;

  const paths = [
    ["tecnico"],
    ["tecnicoResponsavel"],
    ["responsavel"],
    ["responsavelTecnico"],
    ["dev"],
    ["desenvolvedor"],
    ["atendente"],
    ["usuarioTecnico"],
    ["assignedTo"],
    ["technician"],
  ];

  for (const path of paths) {
    const id = normalizeId(readNestedValue(snapshot, path));
    if (id) return id;
  }

  const root = snapshot as Record<string, unknown>;
  const flatKeys = [
    "idtecnico",
    "id_tecnico",
    "iduser",
    "idusuario",
    "id_usuario",
  ];
  for (const key of flatKeys) {
    const val = root[key];
    if (typeof val === "number") return String(val);
    if (typeof val === "string" && val.trim()) return val.trim();
  }

  return null;
}
