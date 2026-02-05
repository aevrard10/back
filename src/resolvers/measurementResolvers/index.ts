import { OkPacket } from "mysql2";
import connection from "../../db";

export const measurementResolvers = {
  Query: {
    measurements: async (
      _parent: any,
      args: { reptile_id: string },
      context: any
    ) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { reptile_id } = args;

      // Vérifier si le reptile appartient à l'utilisateur
      const checkReptileQuery =
        "SELECT * FROM reptiles WHERE id = ? AND user_id = ?";
      const reptile = (await connection
        .promise()
        .query(checkReptileQuery, [reptile_id, userId])) as any;

      if (reptile[0].length === 0) {
        throw new Error("Reptile non trouvé ou non autorisé");
      }

      // Récupérer les mesures
      const query = `
        SELECT id, reptile_id, date, weight, size, size_mesure, weight_mesure
        FROM measurements
        WHERE reptile_id = ?
        ORDER BY date ASC
      `;
      const [results] = (await connection
        .promise()
        .query(query, [reptile_id])) as any;

      const formattedResults = results.map((measurement: any) => ({
        ...measurement,
        date:
          measurement.date && !isNaN(new Date(measurement.date).getTime())
            ? new Intl.DateTimeFormat("fr-FR").format(
                new Date(measurement.date)
              )
            : null,
      }));
      return formattedResults;
    },
  },
  Mutation: {
    addMeasurement: async (
      _parent: any,
      args: { input: any },
      context: any
    ) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { reptile_id, date, weight, size, size_mesure, weight_mesure } =
        args.input;

      // Vérifier si le reptile appartient à l'utilisateur
      const checkReptileQuery =
        "SELECT * FROM reptiles WHERE id = ? AND user_id = ?";
      const reptile = (await connection
        .promise()
        .query(checkReptileQuery, [reptile_id, userId])) as any;

      if (reptile[0].length === 0) {
        throw new Error("Reptile non trouvé ou non autorisé");
      }

      // Insérer la mesure dans la table measurements
      const query = `
        INSERT INTO measurements (reptile_id, date, weight, size, size_mesure, weight_mesure)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [result] = (await connection
        .promise()
        .query(query, [
          reptile_id,
          date,
          weight,
          size,
          size_mesure,
          weight_mesure,
        ])) as OkPacket[];

      return {
        id: result.insertId,
        reptile_id,
        date,
        weight,
        size,
        size_mesure,
        weight_mesure,
      };
    },
  },
};
