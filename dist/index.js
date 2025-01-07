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
const express_1 = __importDefault(require("express"));
const apollo_server_express_1 = require("apollo-server-express");
const shemas_1 = require("./shemas");
const resolvers_1 = require("./resolvers");
const body_parser_1 = __importDefault(require("body-parser"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// Configuration des middlewares globaux
const cors_1 = __importDefault(require("cors"));
app.use(resolvers_1.authenticateUser);
app.use(body_parser_1.default.json()); // Parser les requêtes JSON
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "uploads")));
app.use((0, cors_1.default)()); // Autoriser les requêtes cross-origin
// Configurer Apollo Server
const server = new apollo_server_express_1.ApolloServer({
    typeDefs: shemas_1.typeDefs,
    resolvers: resolvers_1.resolvers,
    context: ({ req }) => {
        console.log("Utilisateur authentifié :", req.user);
        return { user: req.user || null };
    },
});
// Fonction pour démarrer le serveur
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        // Démarrage d'Apollo Server
        yield server.start();
        // Lier Apollo Server avec Express via le middleware
        server.applyMiddleware({ app, path: "/graphql" });
        // Démarrage du serveur Express
        const port = 3030;
        app.listen(port, () => {
            console.log(`🚀 Serveur démarré sur http://localhost:${port}${server.graphqlPath}`);
        });
    });
}
// Lancer le serveur
startServer().catch((error) => {
    console.error("Erreur lors du démarrage du serveur :", error);
});
