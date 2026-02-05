import { OkPacket, RowDataPacket } from "mysql2";
import { executeQuery } from "../../db/utils/dbUtils";

export const foodResolvers = {
  Query: {
    // Récupérer l'état actuel du stock
    foodStock: async (_parent: any, _args: any, context: any) => {
      const userId = context.user?.id;
      if (!userId) throw new Error("Non autorisé");

      const query = `
        SELECT id, name, quantity, unit, last_updated, type 
        FROM food_stock 
      `;
      return await executeQuery(query, [userId]);
    },

    // Récupérer l'historique des changements de stock
    foodStockHistory: async (_parent: any, _args: any, context: any) => {
      const userId = context.user?.id;
      if (!userId) throw new Error("Non autorisé");
    
      const query = `
        SELECT fsh.*, fs.name
        FROM food_stock_history fsh
        JOIN food_stock fs ON fsh.food_id = fs.id
        ORDER BY fsh.date DESC
      `;
      
      return await executeQuery(query, [userId]);
    },
    
  },

  Mutation: {
    // Ajouter un aliment
    addFoodStock: async (_parent: any, args: any, context: any) => {
      try {
      const userId = context.user?.id;
      if (!userId) throw new Error("Non autorisé");

      const { name, quantity, type } = args.input;

      const query = `
      INSERT INTO food_stock (name, quantity, unit, type) 
      VALUES (?, ?, ?, ?)
    `;
      const result = (await executeQuery(query, [name, quantity, "restant(s)", type])) as OkPacket;

      return {
        id: result.insertId,
        name,
        quantity,
        unit: "restant(s)", // Valeur par défaut
        last_updated: new Date().toISOString(),
        type,
      };
    } catch (error) {
      console.error("Erreur lors de l'ajout du stock :", error);
      return null;
    }},

    // Mettre à jour la quantité d'un aliment
    updateFoodStock: async (_parent: any, args: any, context: any) => {
      try {
        const userId = context.user?.id;
        if (!userId) throw new Error("Non autorisé");
    
        const { food_id, quantity_change, reason } = args.input;
        // Vérifier si l'aliment existe
        const checkQuery = "SELECT * FROM food_stock WHERE id = ?";
        const checkResult = await executeQuery(checkQuery, [food_id]) as RowDataPacket[];
    
        if (checkResult.length === 0) {
          return { success: false, message: "Cet aliment n'existe pas." };
        }
    
        // Mettre à jour le stock
        const updateQuery = `
          UPDATE food_stock 
          SET quantity = quantity + ?, last_updated = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        await executeQuery(updateQuery, [quantity_change, food_id]);
    
        // Ajouter une entrée dans l'historique
        const historyQuery = `
          INSERT INTO food_stock_history (food_id, quantity_change, reason, date) 
          VALUES (?, ?, ?, NOW())
        `;
        await executeQuery(historyQuery, [food_id, quantity_change, reason]);
    
        return { success: true, message: "Stock mis à jour avec succès." };
      } catch (error) {
        console.error("Erreur serveur :", error);
        return { success: false, message: "Erreur lors de la mise à jour du stock." };
      }
    }
    
  },
};
