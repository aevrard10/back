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
exports.authResolvers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("../../db"));
dotenv_1.default.config();
const SECRET_KEY = process.env.SECRET_KEY;
exports.authResolvers = {
    Query: {
        currentUser: (_parent, _args, context) => {
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
        register: (_parent, args) => __awaiter(void 0, void 0, void 0, function* () {
            const { username, email, password } = args.input;
            if (!username || !email || !password) {
                throw new Error("Tous les champs sont requis.");
            }
            try {
                const [existingUser] = (yield db_1.default
                    .promise()
                    .query("SELECT id FROM users WHERE email = ?", [
                    email,
                ]));
                if (existingUser.length > 0) {
                    throw new Error("Un utilisateur avec cet email existe déjà.");
                }
                const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
                const [result] = (yield db_1.default
                    .promise()
                    .query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword]));
                return {
                    success: true,
                    message: "Utilisateur enregistré avec succès.",
                    user: { id: result.insertId, username, email },
                };
            }
            catch (error) {
                console.error("Erreur lors de l'enregistrement :", error);
                throw new Error("Erreur lors de l'enregistrement.");
            }
        }),
        login: (_parent, args) => __awaiter(void 0, void 0, void 0, function* () {
            const { email, password, expo_token } = args.input;
            if (!email || !password) {
                throw new Error("Email et mot de passe sont requis.");
            }
            try {
                const [user] = (yield db_1.default
                    .promise()
                    .query("SELECT * FROM users WHERE email = ?", [
                    email,
                ]));
                if (user.length === 0) {
                    throw new Error("Email ou mot de passe incorrect.");
                }
                const isPasswordValid = yield bcryptjs_1.default.compare(password, user[0].password);
                if (!isPasswordValid) {
                    throw new Error("Email ou mot de passe incorrect.");
                }
                if (expo_token) {
                    yield db_1.default
                        .promise()
                        .query("UPDATE users SET expo_token = ? WHERE id = ?", [
                        expo_token,
                        user[0].id,
                    ]);
                }
                const token = jsonwebtoken_1.default.sign({ id: user[0].id, username: user[0].username, email: user[0].email }, SECRET_KEY, { expiresIn: "30d" });
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
            }
            catch (error) {
                console.error("Erreur lors de la connexion :", error);
                throw new Error("Erreur lors de la connexion.");
            }
        }),
        logout: (_parent, _args, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (context.res) {
                context.res.clearCookie("token", {
                    httpOnly: true,
                    secure: true,
                    sameSite: "Strict",
                });
            }
            return { success: true, message: "Déconnexion réussie." };
        }),
    },
};
