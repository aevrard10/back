import { OkPacket, RowDataPacket } from "mysql2";
import { executeQuery } from "../db/utils/dbUtils";
import connection from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;
// TODO : optimiser le code
export const authenticate = (context: any) => {
  const token = context.headers.authorization;

  if (!token) {
    throw new Error("Accès refusé, aucun token fourni.");
  }

  try {
    const decoded = jwt.verify(token, "votre_clé_secrète");
    return decoded; // Contient les infos utilisateur (id, email, etc.)
  } catch (error) {
    throw new Error("Token invalide ou expiré.");
  }
};
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
    logout: async (_parent: any, _args: any, context: any) => {
      try {
        // Exemple avec des cookies
        if (context.res) {
          context.res.clearCookie("token", {
            httpOnly: true,
            secure: true, // HTTPS uniquement
            sameSite: "Strict",
          });
        }

        // Réponse de confirmation
        return {
          success: true,
          message: "Déconnexion réussie.",
        };
      } catch (error) {
        console.error("Erreur lors de la déconnexion :", error);
        return {
          success: false,
          message: "Erreur lors de la déconnexion.",
        };
      }
    },
    register: async (
      _parent: any,
      args: { input: { username: string; email: string; password: string } }
    ) => {
      const { username, email, password } = args.input;

      // Valider les entrées
      if (!username || !email || !password) {
        throw new Error("Tous les champs sont requis.");
      }

      try {
        // Vérifier si l'utilisateur existe déjà
        const [existingUser] = (await connection
          .promise()
          .query("SELECT id FROM users WHERE email = ?", [email])) as any;

        if (existingUser.length > 0) {
          throw new Error("Un utilisateur avec cet email existe déjà.");
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insérer l'utilisateur dans la base de données
        const [result] = (await connection
          .promise()
          .query(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username, email, hashedPassword]
          )) as any;

        const userId = result.insertId;

        return {
          success: true,
          message: "Utilisateur enregistré avec succès.",
          user: { id: userId, username, email },
        };
      } catch (error) {
        console.error("Erreur lors de l'enregistrement :", error);
        throw new Error("Une erreur est survenue lors de l'enregistrement.");
      }
    },

    login: async (
      _parent: any,
      args: { input: { email: string; password: string } }
    ) => {
      const { email, password } = args.input;

      if (!email || !password) {
        throw new Error("Email et mot de passe sont requis.");
      }

      try {
        // Récupérer l'utilisateur depuis la base de données
        const [user] = (await connection
          .promise()
          .query("SELECT * FROM users WHERE email = ?", [email])) as any;

        if (user.length === 0) {
          throw new Error("Email ou mot de passe incorrect.");
        }

        const { id, username, password: hashedPassword } = user[0];

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, hashedPassword);

        if (!isPasswordValid) {
          throw new Error("Email ou mot de passe incorrect.");
        }

        // Générer un token JWT
        const token = jwt.sign({ id, username, email }, SECRET_KEY, {
          expiresIn: "1h",
        });

        return {
          success: true,
          message: "Connexion réussie.",
          token,
          user: { id, username, email },
        };
      } catch (error) {
        console.error("Erreur lors de la connexion :", error);
        throw new Error("Une erreur est survenue lors de la connexion.");
      }
    },
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
