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
exports.reptileResolvers = void 0;
const db_1 = __importDefault(require("../../db"));
const dbUtils_1 = require("../../db/utils/dbUtils");
exports.reptileResolvers = {
    Query: {
        reptileEvent: (_parent, _args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            const query = "SELECT * FROM reptile_events WHERE user_id = ?";
            const results = yield db_1.default.promise().query(query, [userId]);
            return results[0];
        }),
        reptiles: (_parent, _args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            const query = "SELECT * FROM reptiles WHERE user_id = ?";
            const results = yield db_1.default.promise().query(query, [userId]);
            return results[0];
        }),
        reptile: (_parent, args) => __awaiter(void 0, void 0, void 0, function* () {
            const { id } = args; // Récupère l'id du reptile à partir des arguments
            const query = "SELECT * FROM reptiles WHERE id = ?";
            const results = (yield (0, dbUtils_1.executeQuery)(query, [id]));
            // Si aucun reptile n'est trouvé, renvoyez une erreur
            if (results.length === 0) {
                throw new Error("Reptile non trouvé");
            }
            const reptile = results[0];
            const formattedAcquiredDate = new Intl.DateTimeFormat("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            }).format(new Date(reptile.acquired_date));
            const formattedLastFed = new Intl.DateTimeFormat("fr-FR").format(new Date(reptile.last_fed));
            // Retourner le reptile trouvé
            return Object.assign(Object.assign({}, reptile), { acquired_date: formattedAcquiredDate, last_fed: formattedLastFed });
        }),
    },
    Mutation: {
        addReptileEvent: (_parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            const { event_name, event_date, event_time, notes } = args.input;
            const query = "INSERT INTO reptile_events (event_name, event_date, event_time, notes, user_id) VALUES (?, ?, ?, ?, ?)";
            const [result] = (yield db_1.default
                .promise()
                .query(query, [
                event_name,
                event_date,
                event_time,
                notes,
                userId,
            ]));
            return {
                id: result.insertId,
                event_name,
                event_date,
                event_time,
                notes,
                user_id: userId,
            };
        }),
        addReptile: (_parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            // Récupérer tous les champs de l'input
            const { name, species, sort_of_species, sex, age, last_fed, feeding_schedule, diet, humidity_level, temperature_range, health_status, acquired_date, origin, location, notes, } = args.input;
            // Générer la requête SQL avec tous les champs
            const query = `
        INSERT INTO reptiles (
          name, species, sort_of_species, sex, age, last_fed, feeding_schedule, 
          diet, humidity_level, temperature_range, 
          health_status, acquired_date, origin, location, notes, user_id
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
            // Exécuter la requête SQL avec les valeurs correspondantes
            const [result] = (yield db_1.default
                .promise()
                .query(query, [
                name,
                species,
                sort_of_species,
                sex,
                age,
                last_fed,
                feeding_schedule,
                diet,
                humidity_level,
                temperature_range,
                health_status,
                acquired_date,
                origin,
                location,
                notes,
                userId,
            ]));
            // Retourner l'objet avec toutes les informations insérées
            return {
                id: result.insertId,
                name,
                species,
                sort_of_species,
                sex,
                age,
                last_fed,
                feeding_schedule,
                diet,
                humidity_level,
                temperature_range,
                health_status,
                acquired_date,
                origin,
                location,
                notes,
                user_id: userId,
            };
        }),
        deleteReptile: (_parent, args) => __awaiter(void 0, void 0, void 0, function* () {
            const query = "DELETE FROM reptiles WHERE id = ?";
            const [result] = yield db_1.default.promise().query(query, [args.id]);
            if (result.affectedRows === 0) {
                throw new Error("Reptile non trouvé");
            }
            return { success: true, message: "Reptile supprimé avec succès." };
        }),
        addNotes: (_parent, args) => __awaiter(void 0, void 0, void 0, function* () {
            const { id, notes } = args;
            if (!id || !notes) {
                throw new Error("L'ID du reptile et les notes sont requis.");
            }
            const query = "UPDATE reptiles SET notes = ? WHERE id = ?";
            try {
                const resultSet = (yield (0, dbUtils_1.executeQuery)(query, [notes, id]));
                if (resultSet.affectedRows === 0) {
                    throw new Error(`Aucun reptile trouvé avec l'ID : ${id}`);
                }
                return {
                    success: true,
                    message: `Les notes ont été ajoutées avec succès au reptile avec l'ID ${id}.`,
                };
            }
            catch (error) {
                console.error("Erreur lors de l'ajout des notes :", error);
                throw new Error("Erreur lors de l'ajout des notes au reptile.");
            }
        }),
        lastFedUpdate: (_parent, args) => __awaiter(void 0, void 0, void 0, function* () {
            const { id, last_fed } = args;
            if (!id || !last_fed) {
                throw new Error("L'ID du reptile et la date du dernier repas sont requis.");
            }
            const query = "UPDATE reptiles SET last_fed = ? WHERE id = ?";
            try {
                const resultSet = (yield (0, dbUtils_1.executeQuery)(query, [last_fed, id]));
                if (resultSet.affectedRows === 0) {
                    throw new Error(`Aucun reptile trouvé avec l'ID : ${id}`);
                }
                return {
                    success: true,
                    message: `La date du dernier repas a été mise à jour avec succès pour le reptile avec l'ID ${id}.`,
                };
            }
            catch (error) {
                console.error("Erreur lors de la mise à jour de la date du dernier repas :", error);
                throw new Error("Erreur lors de la mise à jour de la date du dernier repas du reptile.");
            }
        }),
        updateReptile: (_parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            const { id, input } = args;
            const { name, species, sort_of_species, sex, age, last_fed, feeding_schedule, diet, humidity_level, temperature_range, health_status, acquired_date, origin, location, notes, } = input;
            // Générer la requête SQL pour la mise à jour du reptile
            const query = `
          UPDATE reptiles 
          SET 
            name = ?, 
            species = ?, 
            sort_of_species = ?, 
            sex = ?, 
            age = ?, 
            last_fed = ?, 
            feeding_schedule = ?, 
            diet = ?, 
            humidity_level = ?, 
            temperature_range = ?, 
            health_status = ?, 
            acquired_date = ?, 
            origin = ?, 
            location = ?, 
            notes = ?
          WHERE id = ? AND user_id = ?;
        `;
            // Exécuter la requête SQL
            const [result] = (yield db_1.default
                .promise()
                .query(query, [
                name,
                species,
                sort_of_species,
                sex,
                age,
                last_fed,
                feeding_schedule,
                diet,
                humidity_level,
                temperature_range,
                health_status,
                acquired_date,
                origin,
                location,
                notes,
                id,
                userId,
            ]));
            // Vérifier si le reptile a été mis à jour
            if (result.affectedRows === 0) {
                throw new Error("Reptile non trouvé ou non autorisé à modifier.");
            }
            return {
                success: true,
                message: "Les données du reptile ont été mises à jour avec succès.",
                reptile: {
                    id,
                    name,
                    species,
                    sort_of_species,
                    sex,
                    age,
                    last_fed,
                    feeding_schedule,
                    diet,
                    humidity_level,
                    temperature_range,
                    health_status,
                    acquired_date,
                    origin,
                    location,
                    notes,
                    user_id: userId,
                },
            };
        }),
    },
};
