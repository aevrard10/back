import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OkPacket, RowDataPacket } from "mysql2";
import dotenv from "dotenv";
import connection from "../../db";
import { executeQuery } from "../../db/utils/dbUtils";

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY!;

export const authResolvers = {
  Query: {
    currentUser: (_parent: any, _args: any, context: any) => {
      // Vérifiez si un utilisateur est authentifié
      if (!context.user) {
        throw new Error("Non autorisé");
      }

      // Retournez les informations de l'utilisateur
      return {
        id: context.user.id,
        email: context.user.email,
        username: context.user.username,
      };
    },
  },
  Mutation: {
    register: async (
      _parent: any,
      args: { input: { username: string; email: string; password: string } }
    ) => {
      const { username, email, password } = args.input;

      if (!username || !email || !password) {
        throw new Error("Tous les champs sont requis.");
      }

      try {
        const [existingUser] = (await connection
          .promise()
          .query("SELECT id FROM users WHERE email = ?", [
            email,
          ])) as RowDataPacket[];

        if (existingUser.length > 0) {
          throw new Error("Un utilisateur avec cet email existe déjà.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = (await connection
          .promise()
          .query(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username, email, hashedPassword]
          )) as OkPacket[];

        return {
          success: true,
          message: "Utilisateur enregistré avec succès.",
          user: { id: result.insertId, username, email },
        };
      } catch (error) {
        console.error("Erreur lors de l'enregistrement :", error);
        throw new Error("Erreur lors de l'enregistrement.");
      }
    },
    login: async (
      _parent: any,
      args: { input: { email: string; password: string; expo_token: string } }
    ) => {
      const { email, password, expo_token } = args.input;

      if (!email || !password) {
        throw new Error("Email et mot de passe sont requis.");
      }

      try {
        const [user] = (await connection
          .promise()
          .query("SELECT * FROM users WHERE email = ?", [
            email,
          ])) as RowDataPacket[];

        if (user.length === 0) {
          throw new Error("Email ou mot de passe incorrect.");
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user[0].password
        );

        if (!isPasswordValid) {
          throw new Error("Email ou mot de passe incorrect.");
        }
        if (expo_token) {
          await connection
            .promise()
            .query("UPDATE users SET expo_token = ? WHERE id = ?", [
              expo_token,
              user[0].id,
            ]);
        }
        const token = jwt.sign(
          { id: user[0].id, username: user[0].username, email: user[0].email },
          SECRET_KEY,
          { expiresIn: "30d" }
        );

        return {
          success: true,
          message: "Connexion réussie.",
          token,
          user: {
            id: user[0].id,
            username: user[0].username,
            email: user[0].email,
          },
        };
      } catch (error) {
        console.error("Erreur lors de la connexion :", error);
        throw new Error("Erreur lors de la connexion.");
      }
    },
    logout: async (_parent: any, _args: any, context: any) => {
      if (context.res) {
        context.res.clearCookie("token", {
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
        });
      }
      return { success: true, message: "Déconnexion réussie." };
    },

    requestPasswordReset: async (
      _parent: any,
      args: { email: string }
    ) => {
      const { email } = args;
      if (!email) {
        return {
          success: false,
          message: "Email requis",
          resetToken: null,
        };
      }
      try {
        const [user] = (await connection
          .promise()
          .query("SELECT id, email, username FROM users WHERE email = ?", [
            email,
          ])) as RowDataPacket[];

        // Réponse générique même si l'email n'existe pas
        if (user.length === 0) {
          return {
            success: true,
            message: "Si un compte existe, un lien de réinitialisation a été généré.",
            resetToken: null,
          };
        }

        const resetToken = jwt.sign(
          { id: user[0].id, email: user[0].email, purpose: "reset" },
          SECRET_KEY,
          { expiresIn: "30m" }
        );

        // En production, on enverrait l'email ici. On renvoie le token pour l'instant.
        return {
          success: true,
          message:
            "Lien de réinitialisation généré (valide 30 minutes).",
          resetToken,
        };
      } catch (error) {
        console.error("Erreur requestPasswordReset :", error);
        throw new Error("Impossible de générer le lien de réinitialisation.");
      }
    },

    resetPassword: async (
      _parent: any,
      args: { input: { token: string; newPassword: string } }
    ) => {
      const { token, newPassword } = args.input;
      if (!token || !newPassword) {
        throw new Error("Token et nouveau mot de passe requis.");
      }
      try {
        const decoded = jwt.verify(token, SECRET_KEY) as any;
        if (decoded.purpose !== "reset") {
          throw new Error("Token invalide.");
        }
        const hashed = await bcrypt.hash(newPassword, 10);
        await connection
          .promise()
          .query("UPDATE users SET password = ? WHERE id = ?", [
            hashed,
            decoded.id,
          ]);

        const loginToken = jwt.sign(
          { id: decoded.id, email: decoded.email },
          SECRET_KEY,
          { expiresIn: "30d" }
        );

        return {
          success: true,
          message: "Mot de passe mis à jour",
          token: loginToken,
          user: { id: decoded.id, email: decoded.email, username: decoded.username },
        };
      } catch (error) {
        console.error("Erreur resetPassword :", error);
        throw new Error("Lien expiré ou invalide.");
      }
    },
  },
};
