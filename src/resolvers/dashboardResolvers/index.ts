import { RowDataPacket } from "mysql2";
import connection from "../../db";

export const dashboardResolvers = {
  Query: {
    dashboardSummary: async (_parent: any, _args: any, context: any) => {
      const userId = context.user?.id;

      if (!userId) {
        throw new Error("Non autorisé");
      }

      const [[reptilesCount]] = (await connection
        .promise()
        .query("SELECT COUNT(*) AS count FROM reptiles WHERE user_id = ?", [
          userId,
        ])) as RowDataPacket[][];

      const [[eventsToday]] = (await connection
        .promise()
        .query(
          "SELECT COUNT(*) AS count FROM reptile_events WHERE user_id = ? AND DATE(event_date) = CURDATE()",
          [userId]
        )) as RowDataPacket[][];

      const [upcomingEvents] = (await connection
        .promise()
        .query(
          `
          SELECT id, event_date, event_name, event_time, notes
          FROM reptile_events
          WHERE user_id = ? AND DATE(event_date) >= CURDATE()
          ORDER BY DATE(event_date) ASC, event_time ASC
          LIMIT 3
        `,
          [userId]
        )) as RowDataPacket[];

      const [[unreadNotifications]] = (await connection
        .promise()
        .query(
          "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND `read` = FALSE",
          [userId]
        )) as RowDataPacket[][];

      return {
        reptiles_count: reptilesCount?.count ?? 0,
        events_today: eventsToday?.count ?? 0,
        unread_notifications: unreadNotifications?.count ?? 0,
        upcoming_events: upcomingEvents ?? [],
      };
    },
  },
};
