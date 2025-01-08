import { OkPacket, RowDataPacket } from "mysql2";
import connection from "../../db";
import { executeQuery } from "../../db/utils/dbUtils";
import db from "../../db";
import path from "path";
import fs from "fs";
export const reptileResolvers = {
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
        SELECT id, reptile_id, date, weight, size
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
      console.log(formattedResults);
      return formattedResults;
    },

    reptileEvent: async (_parent: any, _args: any, context: any) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      const query = "SELECT * FROM reptile_events WHERE user_id = ?";
      const results = await connection.promise().query(query, [userId]);

      return results[0];
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
    reptile: async (_parent: any, args: { id: string }) => {
      const { id } = args; // Récupère l'id du reptile à partir des arguments
      const query = "SELECT * FROM reptiles WHERE id = ?";
      const results = (await executeQuery(query, [id])) as RowDataPacket[];

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
      const formattedNextVetVisit = new Intl.DateTimeFormat("fr-FR").format(
        new Date(reptile.next_vet_visit)
      );

      const formattedLastVetVisit = new Intl.DateTimeFormat("fr-FR").format(
        new Date(reptile.last_vet_visit)
      );
      // Retourner le reptile trouvé
      return {
        ...reptile,
        acquired_date: formattedAcquiredDate,
        last_fed: formattedLastFed,
        next_vet_visit: formattedNextVetVisit,
        last_vet_visit: formattedLastVetVisit,
      };
    },
  },
  Mutation: {
    addReptileEvent: async (_parent: any, args: any, context: any) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { event_name, event_date, event_time, notes } = args.input;

      const query =
        "INSERT INTO reptile_events (event_name, event_date, event_time, notes, user_id) VALUES (?, ?, ?, ?, ?)";
      const [result] = (await connection
        .promise()
        .query(query, [
          event_name,
          event_date,
          event_time,
          notes,
          userId,
        ])) as OkPacket[];

      return {
        id: result.insertId,
        event_name,
        event_date,
        event_time,
        notes,
        user_id: userId,
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
        lighting_requirements,
        health_status,
        acquired_date,
        origin,
        location,
        notes,
        next_vet_visit,
      } = args.input;

      // Générer la requête SQL avec tous les champs
      const query = `
        INSERT INTO reptiles (
          name, species, sort_of_species, sex, age, last_fed, feeding_schedule, 
          diet, humidity_level, temperature_range, lighting_requirements, 
          health_status, acquired_date, origin, location, notes, next_vet_visit, user_id
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          lighting_requirements,
          health_status,
          acquired_date,
          origin,
          location,
          notes,
          next_vet_visit,
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
        lighting_requirements,
        health_status,
        acquired_date,
        origin,
        location,
        notes,
        next_vet_visit,
        user_id: userId,
      };
    },

    deleteReptile: async (_parent: any, args: { id: string }) => {
      const query = "DELETE FROM reptiles WHERE id = ?";

      const [result] = await connection.promise().query(query, [args.id]);

      if ((result as OkPacket).affectedRows === 0) {
        throw new Error("Reptile non trouvé");
      }

      return { success: true, message: "Reptile supprimé avec succès." };
    },
    addNotes: async (_parent: any, args: any) => {
      const { id, notes } = args;

      if (!id || !notes) {
        throw new Error("L'ID du reptile et les notes sont requis.");
      }

      const query = "UPDATE reptiles SET notes = ? WHERE id = ?";

      try {
        const resultSet = (await executeQuery(query, [notes, id])) as any;

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
    addMeasurement: async (
      _parent: any,
      args: { input: any },
      context: any
    ) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { reptile_id, date, weight, size } = args.input;

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
        INSERT INTO measurements (reptile_id, date, weight, size)
        VALUES (?, ?, ?, ?)
      `;
      const [result] = (await connection
        .promise()
        .query(query, [reptile_id, date, weight, size])) as OkPacket[];

      return {
        id: result.insertId,
        reptile_id,
        date,
        weight,
        size,
      };
    },
  },
};
