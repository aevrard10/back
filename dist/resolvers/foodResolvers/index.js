"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.foodResolvers = void 0;
const dbUtils_1 = require("../../db/utils/dbUtils");
exports.foodResolvers = {
    Query: {
        // Récupérer l'état actuel du stock
        foodStock: (_parent, _args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId)
                throw new Error("Non autorisé");
            const query = `
        SELECT id, name, quantity, unit, last_updated, type 
        FROM food_stock 
      `;
            return yield (0, dbUtils_1.executeQuery)(query, [userId]);
        }),
        // Récupérer l'historique des changements de stock
        foodStockHistory: (_parent, _args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId)
                throw new Error("Non autorisé");
            const query = `
        SELECT fsh.*, fs.name
        FROM food_stock_history fsh
        JOIN food_stock fs ON fsh.food_id = fs.id
        ORDER BY fsh.date DESC
      `;
            return yield (0, dbUtils_1.executeQuery)(query, [userId]);
        }),
    },
    Mutation: {
        // Ajouter un aliment
        addFoodStock: (_parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId)
                    throw new Error("Non autorisé");
                const { name, quantity, type } = args.input;
                const query = `
      INSERT INTO food_stock (name, quantity, unit, type) 
      VALUES (?, ?, ?, ?)
    `;
                const result = (yield (0, dbUtils_1.executeQuery)(query, [name, quantity, "restant(s)", type]));
                return {
                    id: result.insertId,
                    name,
                    quantity,
                    unit: "unit", // Valeur par défaut
                    last_updated: new Date().toISOString(),
                    type,
                };
            }
            catch (error) {
                console.error("Erreur lors de l'ajout du stock :", error);
                return null;
            }
        }),
        // Mettre à jour la quantité d'un aliment
        updateFoodStock: (_parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId)
                    throw new Error("Non autorisé");
                const { food_id, quantity_change, reason } = args.input;
                console.log("Requête reçue :", { food_id, quantity_change, reason });
                // Vérifier si l'aliment existe
                const checkQuery = "SELECT * FROM food_stock WHERE id = ?";
                const checkResult = yield (0, dbUtils_1.executeQuery)(checkQuery, [food_id]);
                if (checkResult.length === 0) {
                    console.log("Aucun aliment trouvé pour cet ID et cet utilisateur.");
                    return { success: false, message: "Cet aliment n'existe pas." };
                }
                // Mettre à jour le stock
                const updateQuery = `
          UPDATE food_stock 
          SET quantity = quantity + ?, last_updated = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
                yield (0, dbUtils_1.executeQuery)(updateQuery, [quantity_change, food_id]);
                // Ajouter une entrée dans l'historique
                const historyQuery = `
          INSERT INTO food_stock_history (food_id, quantity_change, reason, date) 
          VALUES (?, ?, ?, NOW())
        `;
                yield (0, dbUtils_1.executeQuery)(historyQuery, [food_id, quantity_change, reason]);
                return { success: true, message: "Stock mis à jour avec succès." };
            }
            catch (error) {
                console.error("Erreur serveur :", error);
                return { success: false, message: "Erreur lors de la mise à jour du stock." };
            }
        })
    },
};
