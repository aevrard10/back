import { OkPacket, RowDataPacket } from "mysql2";
import { executeQuery } from "../db/utils/dbUtils";

// Résolveurs GraphQL
export const resolvers = {
  Query: {
    reptiles: async () => {
      const query = "SELECT * FROM reptiles";
      return await executeQuery(query, []);
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
    deleteReptile: async (_parent: any, args: any) => {
      const { id } = args;

      if (!id) {
        throw new Error("L'ID du reptile est requis pour le supprimer.");
      }

      const query = "DELETE FROM reptiles WHERE id = ?";

      try {
        const resultSet = (await executeQuery(query, [id])) as any;

        if (resultSet.affectedRows === 0) {
          throw new Error(`Aucun reptile trouvé avec l'ID : ${id}`);
        }

        return {
          success: true,
          message: `Le reptile avec l'ID ${id} a été supprimé avec succès.`,
        };
      } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        throw new Error("Erreur lors de la suppression du reptile.");
      }
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
    addReptile: async (_parent: any, args: any) => {
      const { name, species, age, last_fed } = args.input;
      console.log(name, species, age, last_fed);
      if (!name || !species || age === undefined || !last_fed) {
        throw new Error("Tous les champs sont obligatoires.");
      }
      const query =
        "INSERT INTO reptiles (name, species, age, last_fed) VALUES (?, ?, ?, ?)";
      const resultSet = (await executeQuery(query, [
        name,
        species,
        age,
        last_fed,
      ])) as OkPacket;

      if (!resultSet.insertId) {
        throw new Error("Impossible de récupérer l'ID généré par MySQL.");
      }
      return {
        id: resultSet.insertId,
        name,
        species,
        age,
        last_fed,
      };
    },
  },
};
