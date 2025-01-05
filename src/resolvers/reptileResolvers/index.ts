import { OkPacket, RowDataPacket } from "mysql2";
import connection from "../../db";
import { executeQuery } from "../../db/utils/dbUtils";
import db from "../../db";

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

      // Retourner le reptile trouvé
      return results[0]; // On retourne le premier reptile trouvé (car l'id est unique)
    },
  },
  Mutation: {
    addReptile: async (_parent: any, args: any, context: any) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      const { name, species, age, last_fed } = args.input;

      const query =
        "INSERT INTO reptiles (name, species, age, last_fed, user_id) VALUES (?, ?, ?, ?, ?)";
      const [result] = (await connection
        .promise()
        .query(query, [name, species, age, last_fed, userId])) as OkPacket[];

      return {
        id: result.insertId,
        name,
        species,
        age,
        last_fed,
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
    addReptileImage: async (_parent: any, { id, image }: any, context: any) => {
      // Vérifier l'utilisateur
      const userId = context.user?.id;
      if (!userId) {
        throw new Error("Non autorisé");
      }

      // Si l'image n'existe pas
      if (!image) {
        throw new Error("Image non fournie");
      }

      // Définir l'URL de l'image stockée
      const imageUrl = `http://localhost:3030/uploads/${image.filename}`;

      try {
        // Mettre à jour la base de données avec l'URL de l'image
        await db.query("UPDATE reptiles SET image_url = ? WHERE id = ?", [
          imageUrl,
          id,
        ]);

        // Récupérer le reptile mis à jour
        const [updatedReptile] = (await db.query(
          "SELECT * FROM reptiles WHERE id = ?",
          [id]
        )) as any;

        return updatedReptile;
      } catch (error) {
        console.error("Erreur lors de l'ajout de l'image :", error);
        throw new Error("Erreur lors de l'ajout de l'image au reptile.");
      }
    },
    // Autre mutation pour supprimer l'image (si nécessaire)
    deleteReptileImage: async (_parent: any, { id }: any) => {
      try {
        // Mettre à jour la base de données pour supprimer l'image
        await db.query("UPDATE reptiles SET image_url = NULL WHERE id = ?", [
          id,
        ]);

        // Récupérer le reptile mis à jour
        const [updatedReptile] = (await db.query(
          "SELECT * FROM reptiles WHERE id = ?",
          [id]
        )) as any;
        return updatedReptile;
      } catch (error) {
        console.error("Erreur lors de la suppression de l'image :", error);
        throw new Error("Erreur lors de la suppression de l'image du reptile.");
      }
    },
  },
};
