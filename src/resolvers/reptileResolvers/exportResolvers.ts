import connection from "../../db";
import { RowDataPacket } from "mysql2";
import { Buffer } from "buffer";
import PDFDocument from "pdfkit";
import https from "https";

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

const fetchImageBuffer = (url: string): Promise<Buffer | null> => {
  return new Promise((resolve) => {
    try {
      https
        .get(url, (res) => {
          const chunks: Buffer[] = [];
          res
            .on("data", (d) => chunks.push(d))
            .on("end", () => resolve(Buffer.concat(chunks)))
            .on("error", () => resolve(null));
        })
        .on("error", () => resolve(null));
    } catch {
      resolve(null);
    }
  });
};

const exportPdf = async (data: any) => {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));

  const addSectionTitle = (title: string) => {
    doc.moveDown(0.6);
    doc
      .fontSize(13)
      .fillColor("#0d3b2e")
      .text(title, { underline: true });
    doc.moveDown(0.2);
    doc.fillColor("#111");
  };

  const addKeyValue = (key: string, value: any) => {
    doc.fontSize(11).text(`${key}: `, { continued: true }).font("Helvetica-Bold").text(String(value ?? "-"));
    doc.font("Helvetica");
  };

  doc
    .fontSize(18)
    .fillColor("#0d3b2e")
    .text(`Fiche reptile`, { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#555").text(`Généré le ${new Date().toLocaleString("fr-FR")}`);
  doc.fillColor("#111").moveDown();

  if (data.reptile.image_url) {
    const imgBuffer = await fetchImageBuffer(data.reptile.image_url);
    if (imgBuffer) {
      try {
        doc.image(imgBuffer, { fit: [160, 160] });
        doc.moveDown();
      } catch {
        // ignore image errors
      }
    }
  }

  addSectionTitle("Informations principales");
  addKeyValue("Nom", data.reptile.name);
  addKeyValue("Espèce", data.reptile.species);
  addKeyValue("Sexe", data.reptile.sex ?? "-");
  addKeyValue("Âge", data.reptile.age ?? "-");
  addKeyValue("Dernier repas", data.reptile.last_fed ?? "-");
  addKeyValue("État", data.reptile.health_status ?? "-");
  addKeyValue("Origine", data.reptile.origin ?? "-");
  addKeyValue("Emplacement", data.reptile.location ?? "-");

  addSectionTitle("Génétique");
  const g = data.genetics;
  if (g) {
    addKeyValue("Morph", g.morph ?? "-");
    addKeyValue("Mutations", g.mutations ?? "-");
    addKeyValue("Traits", g.traits ?? "-");
    addKeyValue("Lignée", g.lineage ?? "-");
  } else {
    doc.fontSize(11).text("Non renseigné");
  }

  addSectionTitle("Repas (5 derniers)");
  if (data.feedings.length === 0) {
    doc.fontSize(11).text("Aucun repas enregistré");
  } else {
    data.feedings.slice(0, 5).forEach((f: any) => {
      doc
        .fontSize(11)
        .text(`${f.fed_at}: ${f.food_name || "Repas"} (${f.quantity ?? ""} ${f.unit ?? ""})`);
    });
  }

  addSectionTitle("Mues (5 dernières)");
  if (data.sheds.length === 0) {
    doc.fontSize(11).text("Aucune mue enregistrée");
  } else {
    data.sheds.slice(0, 5).forEach((s: any) => {
      doc.fontSize(11).text(`${s.shed_date}`);
    });
  }

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

      return await exportPdf(payload);
    },
  },
};
