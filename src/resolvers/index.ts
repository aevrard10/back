import { OkPacket } from "mysql2";
import connection from "../db";

// Résolveurs GraphQL
export const resolvers = {
  Query: {
    reptiles: async () => {
      try {
        const query = "SELECT * FROM reptiles";
        const results = await new Promise((resolve, reject) => {
          connection.execute(query, (err, results) => {
            if (err) reject(err);
            resolve(results);
          });
        });
        return results;
      } catch (error) {
        console.error(error);
        throw new Error(
          "Une erreur est survenue, veuillez réessayer plus tard."
        );
      }
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
        const [results] = await connection.promise().execute(query, [id]);
        const resultSet = results as any;

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
    addReptile: async (_parent: any, args: any) => {
      const { name, species, age, last_fed } = args.input;
      console.log(name, species, age, last_fed);
      if (!name || !species || age === undefined || !last_fed) {
        throw new Error("Tous les champs sont obligatoires.");
      }
      const query =
        "INSERT INTO reptiles (name, species, age, last_fed) VALUES (?, ?, ?, ?)";
      return new Promise((resolve, reject) => {
        connection.execute(
          query,
          [name, species, age, last_fed],
          (err, results) => {
            if (err) {
              reject(new Error("Erreur lors de l'ajout du reptile"));
            }
            const resultSet = results as OkPacket;
            if (!resultSet?.insertId) {
              return reject(
                new Error("Impossible de récupérer l'ID généré par MySQL.")
              );
            }
            resolve({
              id: resultSet?.insertId, // ID généré automatiquement par MySQL
              name,
              species,
              age,
              last_fed,
            });
          }
        );
      });
    },
  },
};
