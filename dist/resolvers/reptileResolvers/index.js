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
const db_2 = __importDefault(require("../../db"));
exports.reptileResolvers = {
    Query: {
        measurements: (_parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            const { reptile_id } = args;
            // Vérifier si le reptile appartient à l'utilisateur
            const checkReptileQuery = "SELECT * FROM reptiles WHERE id = ? AND user_id = ?";
            const reptile = (yield db_1.default
                .promise()
                .query(checkReptileQuery, [reptile_id, userId]));
            if (reptile[0].length === 0) {
                throw new Error("Reptile non trouvé ou non autorisé");
            }
            // Récupérer les mesures
            const query = `
        SELECT id, reptile_id, date, weight, size
        FROM measurements
        WHERE reptile_id = ?
        ORDER BY date ASC
      `;
            const [results] = (yield db_1.default
                .promise()
                .query(query, [reptile_id]));
            const formattedResults = results.map((measurement) => (Object.assign(Object.assign({}, measurement), { date: measurement.date && !isNaN(new Date(measurement.date).getTime())
                    ? new Intl.DateTimeFormat("fr-FR").format(new Date(measurement.date))
                    : null })));
            console.log(formattedResults);
            return formattedResults;
        }),
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
            const formattedNextVetVisit = new Intl.DateTimeFormat("fr-FR").format(new Date(reptile.next_vet_visit));
            const formattedLastVetVisit = new Intl.DateTimeFormat("fr-FR").format(new Date(reptile.last_vet_visit));
            // Retourner le reptile trouvé
            return Object.assign(Object.assign({}, reptile), { acquired_date: formattedAcquiredDate, last_fed: formattedLastFed, next_vet_visit: formattedNextVetVisit, last_vet_visit: formattedLastVetVisit });
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
            const { name, species, sort_of_species, sex, age, last_fed, feeding_schedule, diet, humidity_level, temperature_range, lighting_requirements, health_status, acquired_date, origin, location, notes, next_vet_visit, } = args.input;
            // Générer la requête SQL avec tous les champs
            const query = `
        INSERT INTO reptiles (
          name, species, sort_of_species, sex, age, last_fed, feeding_schedule, 
          diet, humidity_level, temperature_range, lighting_requirements, 
          health_status, acquired_date, origin, location, notes, next_vet_visit, user_id
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                lighting_requirements,
                health_status,
                acquired_date,
                origin,
                location,
                notes,
                next_vet_visit,
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
                lighting_requirements,
                health_status,
                acquired_date,
                origin,
                location,
                notes,
                next_vet_visit,
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
        addReptileImage: (_parent_1, _a, context_1) => __awaiter(void 0, [_parent_1, _a, context_1], void 0, function* (_parent, { id, image }, context) {
            var _b;
            // Vérifier l'utilisateur
            const userId = (_b = context.user) === null || _b === void 0 ? void 0 : _b.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            // Si l'image n'existe pas
            if (!image) {
                throw new Error("Image non fournie");
            }
            // Définir l'URL de l'image stockée
            const imageUrl = `http://localhost:3030/uploads/${image.filename}`;
            try {
                // Mettre à jour la base de données avec l'URL de l'image
                yield db_2.default.query("UPDATE reptiles SET image_url = ? WHERE id = ?", [
                    imageUrl,
                    id,
                ]);
                // Récupérer le reptile mis à jour
                const [updatedReptile] = (yield db_2.default.query("SELECT * FROM reptiles WHERE id = ?", [id]));
                return updatedReptile;
            }
            catch (error) {
                console.error("Erreur lors de l'ajout de l'image :", error);
                throw new Error("Erreur lors de l'ajout de l'image au reptile.");
            }
        }),
        // Autre mutation pour supprimer l'image (si nécessaire)
        deleteReptileImage: (_parent_1, _a) => __awaiter(void 0, [_parent_1, _a], void 0, function* (_parent, { id }) {
            try {
                // Mettre à jour la base de données pour supprimer l'image
                yield db_2.default.query("UPDATE reptiles SET image_url = NULL WHERE id = ?", [
                    id,
                ]);
                // Récupérer le reptile mis à jour
                const [updatedReptile] = (yield db_2.default.query("SELECT * FROM reptiles WHERE id = ?", [id]));
                return updatedReptile;
            }
            catch (error) {
                console.error("Erreur lors de la suppression de l'image :", error);
                throw new Error("Erreur lors de la suppression de l'image du reptile.");
            }
        }),
        addMeasurement: (_parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            const { reptile_id, date, weight, size } = args.input;
            // Vérifier si le reptile appartient à l'utilisateur
            const checkReptileQuery = "SELECT * FROM reptiles WHERE id = ? AND user_id = ?";
            const reptile = (yield db_1.default
                .promise()
                .query(checkReptileQuery, [reptile_id, userId]));
            if (reptile[0].length === 0) {
                throw new Error("Reptile non trouvé ou non autorisé");
            }
            // Insérer la mesure dans la table measurements
            const query = `
        INSERT INTO measurements (reptile_id, date, weight, size)
        VALUES (?, ?, ?, ?)
      `;
            const [result] = (yield db_1.default
                .promise()
                .query(query, [reptile_id, date, weight, size]));
            return {
                id: result.insertId,
                reptile_id,
                date,
                weight,
                size,
            };
        }),
    },
};
