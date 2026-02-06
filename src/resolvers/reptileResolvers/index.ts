import { OkPacket, RowDataPacket } from "mysql2";
import connection from "../../db";
import { executeQuery } from "../../db/utils/dbUtils";

type ReptileEventRow = RowDataPacket & {
  id: number;
  event_date: string;
  event_name: string;
  event_time: string;
  notes?: string | null;
  recurrence_type?: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | null;
  recurrence_interval?: number | null;
  recurrence_until?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDateOnly = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const matchDash = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchDash) {
    const [, year, month, day] = matchDash;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const matchSlash = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (matchSlash) {
    const [, year, month, day] = matchSlash;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  );
};

const formatDateOnly = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDaysUtc = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY_MS);

const daysInMonthUtc = (year: number, monthIndex: number) =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const addMonthsUtc = (base: Date, months: number, baseDay: number) => {
  const startYear = base.getUTCFullYear();
  const startMonth = base.getUTCMonth();
  const targetMonthIndex = startMonth + months;
  const targetYear = startYear + Math.floor(targetMonthIndex / 12);
  const modMonth = ((targetMonthIndex % 12) + 12) % 12;
  const maxDay = daysInMonthUtc(targetYear, modMonth);
  const day = Math.min(baseDay, maxDay);
  return new Date(Date.UTC(targetYear, modMonth, day));
};

const expandRecurringEvents = (rows: ReptileEventRow[]) => {
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const windowStart = addDaysUtc(todayUtc, -30);
  const windowEnd = addDaysUtc(todayUtc, 365);
  const maxIterations = 5000;

  return rows.flatMap((row) => {
    const baseDate = parseDateOnly(row.event_date);
    if (!baseDate) return [];

    const recurrenceType = row.recurrence_type ?? "NONE";
    const interval = Math.max(1, Number(row.recurrence_interval ?? 1));
    const untilDate = parseDateOnly(row.recurrence_until);

    if (recurrenceType === "NONE") {
      return [
        {
          ...row,
          event_date: formatDateOnly(baseDate),
        },
      ];
    }

    const occurrences: ReptileEventRow[] = [];
    let index = 0;
    const baseDay = baseDate.getUTCDate();

    if (recurrenceType === "DAILY" || recurrenceType === "WEEKLY") {
      const step = recurrenceType === "DAILY" ? interval : interval * 7;
      const diffDays = Math.floor(
        (windowStart.getTime() - baseDate.getTime()) / DAY_MS,
      );
      index = diffDays > 0 ? Math.floor(diffDays / step) : 0;
      let current = addDaysUtc(baseDate, index * step);

      while (current < windowStart) {
        index += 1;
        current = addDaysUtc(baseDate, index * step);
      }

      let iterations = 0;
      while (current <= windowEnd && iterations < maxIterations) {
        if (untilDate && current > untilDate) break;
        occurrences.push({
          ...row,
          event_date: formatDateOnly(current),
        });
        index += 1;
        current = addDaysUtc(baseDate, index * step);
        iterations += 1;
      }
      return occurrences;
    }

    if (recurrenceType === "MONTHLY") {
      const monthDiff =
        (windowStart.getUTCFullYear() - baseDate.getUTCFullYear()) * 12 +
        (windowStart.getUTCMonth() - baseDate.getUTCMonth());
      index = monthDiff > 0 ? Math.floor(monthDiff / interval) : 0;
      let current = addMonthsUtc(baseDate, index * interval, baseDay);

      while (current < windowStart) {
        index += 1;
        current = addMonthsUtc(baseDate, index * interval, baseDay);
      }

      let iterations = 0;
      while (current <= windowEnd && iterations < maxIterations) {
        if (untilDate && current > untilDate) break;
        occurrences.push({
          ...row,
          event_date: formatDateOnly(current),
        });
        index += 1;
        current = addMonthsUtc(baseDate, index * interval, baseDay);
        iterations += 1;
      }
      return occurrences;
    }

    return [];
  });
};

export const reptileResolvers = {
  Query: {
    reptileEvent: async (_parent: any, _args: any, context: any) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      const query = "SELECT * FROM reptile_events WHERE user_id = ?";
      const results = await connection.promise().query(query, [userId]);

      const rows = results[0] as ReptileEventRow[];
      return expandRecurringEvents(rows);
    },
    reptileGenetics: async (
      _parent: any,
      args: { reptile_id: string },
      context: any
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { reptile_id } = args;
      if (!reptile_id) {
        throw new Error("L'identifiant du reptile est requis.");
      }

      const [reptiles] = (await connection
        .promise()
        .query("SELECT id FROM reptiles WHERE id = ? AND user_id = ?", [
          reptile_id,
          userId,
        ])) as RowDataPacket[];

      if (reptiles.length === 0) {
        throw new Error("Reptile non trouvé ou non autorisé");
      }

      const [rows] = (await connection.promise().query(
        `
        SELECT * FROM reptile_genetics WHERE reptile_id = ?
      `,
        [reptile_id]
      )) as RowDataPacket[];

      return rows[0] ?? null;
    },
    reptileFeedings: async (
      _parent: any,
      args: { reptile_id: string },
      context: any
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { reptile_id } = args;
      if (!reptile_id) {
        throw new Error("L'identifiant du reptile est requis.");
      }

      const [reptiles] = (await connection
        .promise()
        .query("SELECT id FROM reptiles WHERE id = ? AND user_id = ?", [
          reptile_id,
          userId,
        ])) as RowDataPacket[];

      if (reptiles.length === 0) {
        throw new Error("Reptile non trouvé ou non autorisé");
      }

      const [rows] = (await connection.promise().query(
        `
        SELECT * FROM reptile_feedings WHERE reptile_id = ? ORDER BY fed_at DESC
      `,
        [reptile_id]
      )) as RowDataPacket[];

      return rows;
    },
    reptileSheds: async (
      _parent: any,
      args: { reptile_id: string },
      context: any
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { reptile_id } = args;
      if (!reptile_id) {
        throw new Error("L'identifiant du reptile est requis.");
      }

      const [reptiles] = (await connection
        .promise()
        .query("SELECT id FROM reptiles WHERE id = ? AND user_id = ?", [
          reptile_id,
          userId,
        ])) as RowDataPacket[];

      if (reptiles.length === 0) {
        throw new Error("Reptile non trouvé ou non autorisé");
      }

      const [rows] = (await connection.promise().query(
        `
        SELECT * FROM reptile_sheds WHERE reptile_id = ? ORDER BY shed_date DESC
      `,
        [reptile_id]
      )) as RowDataPacket[];

      return rows;
    },
    reptilePhotos: async (
      _parent: any,
      args: { reptile_id: string },
      context: any
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { reptile_id } = args;
      if (!reptile_id) {
        throw new Error("L'identifiant du reptile est requis.");
      }

      const [reptiles] = (await connection
        .promise()
        .query("SELECT id FROM reptiles WHERE id = ? AND user_id = ?", [
          reptile_id,
          userId,
        ])) as RowDataPacket[];

      if (reptiles.length === 0) {
        throw new Error("Reptile non trouvé ou non autorisé");
      }

      const [photos] = (await connection
        .promise()
        .query(
          "SELECT id, reptile_id, url, created_at FROM reptile_photos WHERE reptile_id = ? ORDER BY created_at DESC",
          [reptile_id]
        )) as RowDataPacket[];

      return photos;
    },
    reptiles: async (_parent: any, _args: any, context: any) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      const query = "SELECT * FROM reptiles WHERE user_id = ?";
      const results = await connection.promise().query(query, [userId]);

      return results[0];
    },
    reptile: async (_parent: any, args: { id: string }, context: any) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }
      const { id } = args; // Récupère l'id du reptile à partir des arguments
      const query = "SELECT * FROM reptiles WHERE id = ? AND user_id = ?";
      const results = (await executeQuery(query, [id, userId])) as RowDataPacket[];

      // Si aucun reptile n'est trouvé, renvoyez une erreur
      if (results.length === 0) {
        throw new Error("Reptile non trouvé");
      }
      const reptile = results[0];
 
      
      const formattedAcquiredDate = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(reptile.acquired_date));

      const formattedLastFed = new Intl.DateTimeFormat("fr-FR").format(
        new Date(reptile.last_fed)
      );

      // Retourner le reptile trouvé
      return {
        ...reptile,
        acquired_date: formattedAcquiredDate,
        last_fed: formattedLastFed,
      };
    },
  },
  Mutation: {
    addReptileEvent: async (_parent: any, args: any, context: any) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      const {
        event_name,
        event_date,
        event_time,
        notes,
        recurrence_type = "NONE",
        recurrence_interval = 1,
        recurrence_until = null,
      } = args.input;

      if (!event_date) {
        throw new Error("La date de l'événement est requise.");
      }

      const query =
        "INSERT INTO reptile_events (event_name, event_date, event_time, notes, user_id, recurrence_type, recurrence_interval, recurrence_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      const [result] = (await connection
        .promise()
        .query(query, [
          event_name,
          event_date,
          event_time,
          notes,
          userId,
          recurrence_type,
          recurrence_interval,
          recurrence_until,
        ])) as OkPacket[];

      return {
        id: result.insertId,
        event_name,
        event_date,
        event_time,
        notes,
        user_id: userId,
        recurrence_type,
        recurrence_interval,
        recurrence_until,
      };
    },
    upsertReptileGenetics: async (
      _parent: any,
      args: { input: any },
      context: any
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      const {
        reptile_id,
        morph,
        mutations,
        hets,
        traits,
        lineage,
        breeder,
        hatch_date,
        sire_name,
        dam_name,
        notes,
      } = args.input;

      if (!reptile_id) {
        throw new Error("L'identifiant du reptile est requis.");
      }

      const [reptiles] = (await connection
        .promise()
        .query("SELECT id FROM reptiles WHERE id = ? AND user_id = ?", [
          reptile_id,
          userId,
        ])) as RowDataPacket[];

      if (reptiles.length === 0) {
        throw new Error("Reptile non trouvé ou non autorisé");
      }

      await connection.promise().query(
        `
        INSERT INTO reptile_genetics (
          reptile_id, morph, mutations, hets, traits, lineage, breeder, hatch_date, sire_name, dam_name, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          morph = VALUES(morph),
          mutations = VALUES(mutations),
          hets = VALUES(hets),
          traits = VALUES(traits),
          lineage = VALUES(lineage),
          breeder = VALUES(breeder),
          hatch_date = VALUES(hatch_date),
          sire_name = VALUES(sire_name),
          dam_name = VALUES(dam_name),
          notes = VALUES(notes)
      `,
        [
          reptile_id,
          morph,
          mutations,
          hets,
          traits,
          lineage,
          breeder,
          hatch_date,
          sire_name,
          dam_name,
          notes,
        ]
      );

      const [rows] = (await connection.promise().query(
        "SELECT * FROM reptile_genetics WHERE reptile_id = ?",
        [reptile_id]
      )) as RowDataPacket[];

      return rows[0];
    },
    addReptileFeeding: async (
      _parent: any,
      args: { input: any },
      context: any
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      const {
        reptile_id,
        food_id,
        food_name,
        quantity,
        unit,
        fed_at,
        notes,
      } = args.input;

      if (!reptile_id || !fed_at) {
        throw new Error("Reptile et date du nourrissage requis.");
      }

      const [reptiles] = (await connection
        .promise()
        .query("SELECT id FROM reptiles WHERE id = ? AND user_id = ?", [
          reptile_id,
          userId,
        ])) as RowDataPacket[];

      if (reptiles.length === 0) {
        throw new Error("Reptile non trouvé ou non autorisé");
      }

      const normalizedFedAt = (() => {
        if (!fed_at) return fed_at;
        const parsed = new Date(fed_at);
        if (isNaN(parsed.getTime())) return fed_at;
        return parsed.toISOString().slice(0, 19).replace("T", " ");
      })();

      const [result] = (await connection.promise().query(
        `
        INSERT INTO reptile_feedings (
          reptile_id, food_id, food_name, quantity, unit, fed_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          reptile_id,
          food_id ?? null,
          food_name ?? null,
          quantity ?? 1,
          unit ?? "restant(s)",
          normalizedFedAt,
          notes ?? null,
        ]
      )) as OkPacket[];

      await connection
        .promise()
        .query("UPDATE reptiles SET last_fed = ? WHERE id = ?", [
          normalizedFedAt,
          reptile_id,
        ]);

      return {
        id: result.insertId,
        reptile_id,
        food_id,
        food_name,
        quantity: quantity ?? 1,
        unit: unit ?? "restant(s)",
        fed_at: normalizedFedAt,
        notes,
        created_at: new Date().toISOString(),
      };
    },
    deleteReptileFeeding: async (
      _parent: any,
      args: { id: string },
      context: any
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { id } = args;
      if (!id) {
        throw new Error("L'identifiant du nourrissage est requis.");
      }

      const [result] = (await connection.promise().query(
        `
        DELETE rf FROM reptile_feedings rf
        JOIN reptiles r ON r.id = rf.reptile_id
        WHERE rf.id = ? AND r.user_id = ?
      `,
        [id, userId]
      )) as OkPacket[];

      if (result.affectedRows === 0) {
        throw new Error("Nourrissage non trouvé ou non autorisé.");
      }

      return {
        success: true,
        message: "Nourrissage supprimé avec succès.",
      };
    },
    addReptileShed: async (
      _parent: any,
      args: { input: any },
      context: any
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { reptile_id, shed_date, notes } = args.input;

      if (!reptile_id || !shed_date) {
        throw new Error("Reptile et date de mue requis.");
      }

      const [reptiles] = (await connection
        .promise()
        .query("SELECT id FROM reptiles WHERE id = ? AND user_id = ?", [
          reptile_id,
          userId,
        ])) as RowDataPacket[];

      if (reptiles.length === 0) {
        throw new Error("Reptile non trouvé ou non autorisé");
      }

      const [result] = (await connection.promise().query(
        `
        INSERT INTO reptile_sheds (reptile_id, shed_date, notes)
        VALUES (?, ?, ?)
      `,
        [reptile_id, shed_date, notes ?? null]
      )) as OkPacket[];

      return {
        id: result.insertId,
        reptile_id,
        shed_date,
        notes,
        created_at: new Date().toISOString(),
      };
    },
    deleteReptileShed: async (
      _parent: any,
      args: { id: string },
      context: any
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { id } = args;
      if (!id) {
        throw new Error("L'identifiant de la mue est requis.");
      }

      const [result] = (await connection.promise().query(
        `
        DELETE rs FROM reptile_sheds rs
        JOIN reptiles r ON r.id = rs.reptile_id
        WHERE rs.id = ? AND r.user_id = ?
      `,
        [id, userId]
      )) as OkPacket[];

      if (result.affectedRows === 0) {
        throw new Error("Mue non trouvée ou non autorisée.");
      }

      return {
        success: true,
        message: "Mue supprimée avec succès.",
      };
    },
    deleteReptileEvent: async (
      _parent: any,
      args: { id: string },
      context: any
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { id } = args;
      if (!id) {
        throw new Error("L'identifiant de l'événement est requis.");
      }

      const query =
        "DELETE FROM reptile_events WHERE id = ? AND user_id = ?";
      const [result] = (await connection
        .promise()
        .query(query, [id, userId])) as OkPacket[];

      if (result.affectedRows === 0) {
        throw new Error("Événement non trouvé ou non autorisé.");
      }

      return {
        success: true,
        message: "Événement supprimé avec succès.",
      };
    },
    deleteReptilePhoto: async (
      _parent: any,
      args: { id: string },
      context: any
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { id } = args;
      if (!id) {
        throw new Error("L'identifiant de la photo est requis.");
      }

      const [result] = (await connection.promise().query(
        `
        DELETE rp FROM reptile_photos rp
        JOIN reptiles r ON r.id = rp.reptile_id
        WHERE rp.id = ? AND r.user_id = ?
      `,
        [id, userId]
      )) as OkPacket[];

      if (result.affectedRows === 0) {
        throw new Error("Photo non trouvée ou non autorisée.");
      }

      return {
        success: true,
        message: "Photo supprimée avec succès.",
      };
    },
    addReptile: async (_parent: any, args: any, context: any) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      // Récupérer tous les champs de l'input
      const {
        name,
        species,
        sort_of_species,
        sex,
        age,
        last_fed,
        feeding_schedule,
        diet,
        humidity_level,
        temperature_range,
        health_status,
        acquired_date,
        origin,
        location,
        notes,
      } = args.input;

      // Générer la requête SQL avec tous les champs
      const query = `
        INSERT INTO reptiles (
          name, species, sort_of_species, sex, age, last_fed, feeding_schedule, 
          diet, humidity_level, temperature_range, 
          health_status, acquired_date, origin, location, notes, user_id
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Exécuter la requête SQL avec les valeurs correspondantes
      const [result] = (await connection
        .promise()
        .query(query, [
          name,
          species,
          sort_of_species,
          sex,
          age,
          last_fed,
          feeding_schedule,
          diet,
          humidity_level,
          temperature_range,
          health_status,
          acquired_date,
          origin,
          location,
          notes,
          userId,
        ])) as OkPacket[];

      // Retourner l'objet avec toutes les informations insérées
      return {
        id: result.insertId,
        name,
        species,
        sort_of_species,
        sex,
        age,
        last_fed,
        feeding_schedule,
        diet,
        humidity_level,
        temperature_range,
        health_status,
        acquired_date,
        origin,
        location,
        notes,
        user_id: userId,
      };
    },

    deleteReptile: async (_parent: any, args: { id: string }, context: any) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }
      const query = "DELETE FROM reptiles WHERE id = ? AND user_id = ?";

      const [result] = await connection
        .promise()
        .query(query, [args.id, userId]);

      if ((result as OkPacket).affectedRows === 0) {
        throw new Error("Reptile non trouvé");
      }

      return { success: true, message: "Reptile supprimé avec succès." };
    },
    addNotes: async (_parent: any, args: any, context: any) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }
      const { id, notes } = args;

      if (!id || !notes) {
        throw new Error("L'ID du reptile et les notes sont requis.");
      }

      const query = "UPDATE reptiles SET notes = ? WHERE id = ? AND user_id = ?";

      try {
        const resultSet = (await executeQuery(query, [notes, id, userId])) as any;

        if (resultSet.affectedRows === 0) {
          throw new Error(`Aucun reptile trouvé avec l'ID : ${id}`);
        }

        return {
          success: true,
          message: `Les notes ont été ajoutées avec succès au reptile avec l'ID ${id}.`,
        };
      } catch (error) {
        console.error("Erreur lors de l'ajout des notes :", error);
        throw new Error("Erreur lors de l'ajout des notes au reptile.");
      }
    },
    lastFedUpdate: async (_parent: any, args: any, context: any) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }
      const { id, last_fed } = args;

      if (!id || !last_fed) {
        throw new Error("L'ID du reptile et la date du dernier repas sont requis.");
      }

      const query = "UPDATE reptiles SET last_fed = ? WHERE id = ? AND user_id = ?";

      try {
        const resultSet = (await executeQuery(query, [last_fed, id, userId])) as any;

        if (resultSet.affectedRows === 0) {
          throw new Error(`Aucun reptile trouvé avec l'ID : ${id}`);
        }

        return {
          success: true,
          message: `La date du dernier repas a été mise à jour avec succès pour le reptile avec l'ID ${id}.`,
        };
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la date du dernier repas :", error);
        throw new Error("Erreur lors de la mise à jour de la date du dernier repas du reptile.");
      }
    },

      updateReptile: async (_parent: any, args: { id: string, input: any }, context: any) => {
        const userId = context.user?.id;
    
        if (!userId) {
          throw new Error("Non autorisé");
        }
    
        const { id, input } = args;
        const {
          name,
          species,
          sort_of_species,
          sex,
          age,
          last_fed,
          feeding_schedule,
          diet,
          humidity_level,
          temperature_range,
          health_status,
          acquired_date,
          origin,
          location,
          notes,
        } = input;
    
        // Générer la requête SQL pour la mise à jour du reptile
        const query = `
          UPDATE reptiles 
          SET 
            name = ?, 
            species = ?, 
            sort_of_species = ?, 
            sex = ?, 
            age = ?, 
            last_fed = ?, 
            feeding_schedule = ?, 
            diet = ?, 
            humidity_level = ?, 
            temperature_range = ?, 
            health_status = ?, 
            acquired_date = ?, 
            origin = ?, 
            location = ?, 
            notes = ?
          WHERE id = ? AND user_id = ?;
        `;
    
        // Exécuter la requête SQL
        const [result] = (await connection
          .promise()
          .query(query, [
            name,
            species,
            sort_of_species,
            sex,
            age,
            last_fed,
            feeding_schedule,
            diet,
            humidity_level,
            temperature_range,
            health_status,
            acquired_date,
            origin,
            location,
            notes,
            id,
            userId,
          ])) as OkPacket[];
    
        // Vérifier si le reptile a été mis à jour
        if (result.affectedRows === 0) {
          throw new Error("Reptile non trouvé ou non autorisé à modifier.");
        }
    
        return {
          success: true,
          message: "Les données du reptile ont été mises à jour avec succès.",
          reptile: {
            id,
            name,
            species,
            sort_of_species,
            sex,
            age,
            last_fed,
            feeding_schedule,
            diet,
            humidity_level,
            temperature_range,
            health_status,
            acquired_date,
            origin,
            location,
            notes,
            user_id: userId,
          },
        };
      },
    
  },
};
