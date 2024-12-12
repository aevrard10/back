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
    addReptile: async (_parent: any, args: any) => {
      const { name, species, age, last_fed } = args;
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

            resolve({
              id: resultSet,
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
