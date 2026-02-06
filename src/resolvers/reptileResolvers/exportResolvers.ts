import connection from "../../db";
import { RowDataPacket } from "mysql2";
import { Buffer } from "buffer";
import PDFDocument from "pdfkit";

const buildCsv = (reptile: any, feedings: any[], sheds: any[], genetics: any) => {
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };
  const lines = [
    ["Reptile", "Valeur"],
    ["Nom", reptile.name],
    ["Espèce", reptile.species],
    ["Sexe", reptile.sex],
    ["Âge", reptile.age],
    ["Dernier repas", reptile.last_fed],
    ["État", reptile.health_status],
    ["Origine", reptile.origin],
    ["Emplacement", reptile.location],
  ];
  lines.push([]);
  lines.push(["Génétique", ""]);
  if (genetics) {
    lines.push(["Morph", genetics.morph]);
    lines.push(["Mutations", genetics.mutations]);
    lines.push(["Traits", genetics.traits]);
    lines.push(["Lignée", genetics.lineage]);
  }
  lines.push([]);
  lines.push(["Repas (5 derniers)", ""]);
  feedings.slice(0, 5).forEach((f) => {
    lines.push([`${f.fed_at} - ${f.food_name || "Repas"}`, `${f.quantity ?? ""} ${f.unit ?? ""}`]);
  });
  lines.push([]);
  lines.push(["Mues (5 dernières)", ""]);
  sheds.slice(0, 5).forEach((s) => {
    lines.push([s.shed_date, "mue"]);
  });
  return lines.map((row) => row.map(escape).join(",")).join("\n");
};

const exportCsv = (data: any) => {
  const csv = buildCsv(data.reptile, data.feedings, data.sheds, data.genetics);
  const base64 = Buffer.from(csv, "utf8").toString("base64");
  return {
    filename: `reptile-${data.reptile.id}.csv`,
    mime: "text/csv",
    base64,
  };
};

const exportPdf = async (data: any) => {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));

  doc.fontSize(18).text(`Fiche reptile`, { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Nom: ${data.reptile.name}`);
  doc.text(`Espèce: ${data.reptile.species}`);
  doc.text(`Sexe: ${data.reptile.sex ?? "-"}`);
  doc.text(`Âge: ${data.reptile.age ?? "-"}`);
  doc.text(`Dernier repas: ${data.reptile.last_fed ?? "-"}`);
  doc.text(`État: ${data.reptile.health_status ?? "-"}`);
  doc.text(`Origine: ${data.reptile.origin ?? "-"}`);
  doc.text(`Emplacement: ${data.reptile.location ?? "-"}`);
  doc.moveDown();

  doc.fontSize(14).text(`Génétique`, { underline: true });
  const g = data.genetics;
  if (g) {
    doc.fontSize(12).text(`Morph: ${g.morph ?? "-"}`);
    doc.text(`Mutations: ${g.mutations ?? "-"}`);
    doc.text(`Traits: ${g.traits ?? "-"}`);
    doc.text(`Lignée: ${g.lineage ?? "-"}`);
  } else {
    doc.fontSize(12).text("Non renseigné");
  }
  doc.moveDown();

  doc.fontSize(14).text(`Repas (5 derniers)`, { underline: true });
  data.feedings.slice(0, 5).forEach((f: any) => {
    doc
      .fontSize(12)
      .text(`${f.fed_at}: ${f.food_name || "Repas"} (${f.quantity ?? ""} ${f.unit ?? ""})`);
  });
  doc.moveDown();

  doc.fontSize(14).text(`Mues (5 dernières)`, { underline: true });
  data.sheds.slice(0, 5).forEach((s: any) => {
    doc.fontSize(12).text(`${s.shed_date}`);
  });

  doc.end();

  await new Promise<void>((resolve) => doc.on("end", () => resolve()));
  const buffer = Buffer.concat(chunks);
  const base64 = buffer.toString("base64");
  return {
    filename: `reptile-${data.reptile.id}.pdf`,
    mime: "application/pdf",
    base64,
  };
};

export const exportResolvers = {
  Query: {
    exportReptile: async (_parent: any, args: any, context: any) => {
      const user = context.user;
      if (!user?.id) {
        throw new Error("Non autorisé");
      }
      const { id, format } = args as { id: string; format: string };

      const [reptiles] = (await connection
        .promise()
        .query("SELECT * FROM reptiles WHERE id = ? AND user_id = ?", [
          id,
          user.id,
        ])) as RowDataPacket[];
      if (reptiles.length === 0) {
        throw new Error("Reptile introuvable");
      }
      const reptile = reptiles[0];

      const [feedings] = (await connection
        .promise()
        .query(
          "SELECT food_name, quantity, unit, fed_at FROM reptile_feedings WHERE reptile_id = ? ORDER BY fed_at DESC LIMIT 10",
          [id]
        )) as RowDataPacket[];

      const [sheds] = (await connection
        .promise()
        .query(
          "SELECT shed_date FROM reptile_sheds WHERE reptile_id = ? ORDER BY shed_date DESC LIMIT 10",
          [id]
        )) as RowDataPacket[];

      const [geneticsRows] = (await connection
        .promise()
        .query(
          "SELECT morph, mutations, hets, traits, lineage FROM reptile_genetics WHERE reptile_id = ? LIMIT 1",
          [id]
        )) as RowDataPacket[];

      const payload = {
        reptile,
        feedings,
        sheds,
        genetics: geneticsRows[0] || null,
      };

      if (format === "CSV") {
        return exportCsv(payload);
      }

      return await exportPdf(payload);
    },
  },
};
