import { RowDataPacket } from "mysql2";
import connection from "../../db";

type CountRow = RowDataPacket & { count: number };
type UpcomingEventRow = RowDataPacket & {
  id: number;
  event_date: string;
  event_name: string;
  event_time: string;
  notes: string | null;
};

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
        ])) as CountRow[][];

      const [[eventsToday]] = (await connection
        .promise()
        .query(
          "SELECT COUNT(*) AS count FROM reptile_events WHERE user_id = ? AND DATE(event_date) = CURDATE()",
          [userId]
        )) as CountRow[][];

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
        )) as [UpcomingEventRow[], unknown];

      const [[unreadNotifications]] = (await connection
        .promise()
        .query(
          "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND `read` = FALSE",
          [userId]
        )) as CountRow[][];

      return {
        reptiles_count: reptilesCount?.count ?? 0,
        events_today: eventsToday?.count ?? 0,
        unread_notifications: unreadNotifications?.count ?? 0,
        upcoming_events: upcomingEvents ?? [],
      };
    },
  },
};
