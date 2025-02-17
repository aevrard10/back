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
exports.measurementResolvers = void 0;
const db_1 = __importDefault(require("../../db"));
exports.measurementResolvers = {
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
        SELECT id, reptile_id, date, weight, size, size_mesure, weight_mesure
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
    },
    Mutation: {
        addMeasurement: (_parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const userId = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                throw new Error("Non autorisé");
            }
            const { reptile_id, date, weight, size, size_mesure, weight_mesure } = args.input;
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
        INSERT INTO measurements (reptile_id, date, weight, size, size_mesure, weight_mesure)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
            const [result] = (yield db_1.default
                .promise()
                .query(query, [
                reptile_id,
                date,
                weight,
                size,
                size_mesure,
                weight_mesure,
            ]));
            return {
                id: result.insertId,
                reptile_id,
                date,
                weight,
                size,
                size_mesure,
                weight_mesure,
            };
        }),
    },
};
