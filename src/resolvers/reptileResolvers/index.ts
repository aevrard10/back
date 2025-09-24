import { OkPacket, RowDataPacket } from "mysql2";
import connection from "../../db";
import { executeQuery } from "../../db/utils/dbUtils";

export const reptileResolvers = {
  Query: {
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

      const { event_name, event_date, event_time, notes } = args.input;

      const query =
        "INSERT INTO reptile_events (event_name, event_date, event_time, notes, user_id) VALUES (?, ?, ?, ?, ?)";
      const [result] = (await connection.query(query, [
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
      const [result] = (await connection.query(query, [
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
    lastFedUpdate: async (_parent: any, args: any) => {
      const { id, last_fed } = args;

      if (!id || !last_fed) {
        throw new Error(
          "L'ID du reptile et la date du dernier repas sont requis."
        );
      }

      const query = "UPDATE reptiles SET last_fed = ? WHERE id = ?";

      try {
        const resultSet = (await executeQuery(query, [last_fed, id])) as any;

        if (resultSet.affectedRows === 0) {
          throw new Error(`Aucun reptile trouvé avec l'ID : ${id}`);
        }

        return {
          success: true,
          message: `La date du dernier repas a été mise à jour avec succès pour le reptile avec l'ID ${id}.`,
        };
      } catch (error) {
        console.error(
          "Erreur lors de la mise à jour de la date du dernier repas :",
          error
        );
        throw new Error(
          "Erreur lors de la mise à jour de la date du dernier repas du reptile."
        );
      }
    },

    updateReptile: async (
      _parent: any,
      args: { id: string; input: any },
      context: any
    ) => {
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
      const [result] = (await connection.query(query, [
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
