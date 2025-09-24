import { OkPacket, RowDataPacket } from "mysql2";
import connection from "../../db";

export const notificationsResolvers = {
  Query: {
    getNotifications: async (_parent: any, args: any, context: any) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      // Sélectionner toutes les notifications d'un utilisateur, triées par date
      const query = `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`;
      const [notifications] = await connection.query(query, [userId]);

      return notifications;
    },

    getUnreadNotificationsCount: async (
      _parent: any,
      args: any,
      context: any
    ) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      // Compter le nombre de notifications non lues
      const query = `SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND \`read\` = FALSE`;
      const [result] = (await connection.query(query, [
        userId,
      ])) as RowDataPacket[];

      return result[0].unread_count;
    },
  },
  Mutation: {
    // Exemple pour ajouter une notification

    // Exemple pour marquer une notification comme lue
    markNotificationAsRead: async (
      _parent: any,
      args: { id: number },
      context: any
    ) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }
      if (!args.id) {
        throw new Error("L'identifiant de la notification est requis");
      }
      const query = `UPDATE notifications SET \`read\` = TRUE WHERE id = ? AND user_id = ?`;
      const [result] = await connection.query(query, [args.id, userId]);

      if ((result as OkPacket).affectedRows === 0) {
        throw new Error("Notification non trouvée ou non autorisée");
      }

      return { success: true, message: "Notification marquée comme lue" };
    },
  },
};
