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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsResolvers = void 0;
const db_1 = __importDefault(require("../../db"));
exports.notificationsResolvers = {
    Query: {
        getNotifications: (_parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            // Sélectionner toutes les notifications d'un utilisateur, triées par date
            const query = `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`;
            const [notifications] = yield db_1.default.promise().query(query, [userId]);
            return notifications;
        }),
        getUnreadNotificationsCount: (_parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            // Compter le nombre de notifications non lues
            const query = `SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND \`read\` = FALSE`;
            const [result] = (yield db_1.default
                .promise()
                .query(query, [userId]));
            return result[0].unread_count;
        }),
    },
    Mutation: {
        // Exemple pour ajouter une notification
        // Exemple pour marquer une notification comme lue
        markNotificationAsRead: (_parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            if (!args.id) {
                throw new Error("L'identifiant de la notification est requis");
            }
            const query = `UPDATE notifications SET \`read\` = TRUE WHERE id = ? AND user_id = ?`;
            const [result] = yield db_1.default
                .promise()
                .query(query, [args.id, userId]);
            if (result.affectedRows === 0) {
                throw new Error("Notification non trouvée ou non autorisée");
            }
            return { success: true, message: "Notification marquée comme lue" };
        }),
    },
};
