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
const node_cron_1 = __importDefault(require("node-cron"));
// Configuration des middlewares globaux
const cors_1 = __importDefault(require("cors"));
const notificationService_1 = require("./notifications/notificationService");
const db_1 = __importDefault(require("./db"));
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const app = (0, express_1.default)();
app.use(resolvers_1.authenticateUser);
app.use(body_parser_1.default.json()); // Parser les requêtes JSON
app.use((0, cors_1.default)()); // Autoriser les requêtes cross-origin
const port = process.env.PORT || 3030;
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Configuration de Multer avec Cloudinary
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: "repti-track", // 📌 Nom du dossier dans Cloudinary
        format: () => __awaiter(void 0, void 0, void 0, function* () { return "png"; }), // Format des images
        public_id: (req, file) => Date.now().toString(), // Nom unique
    },
});
const upload = (0, multer_1.default)({ storage: storage });
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "uploads")));
app.post("/api/upload", upload.single("image"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Aucun fichier reçu" });
        }
        // Lien de l'image sur Cloudinary
        const imageUrl = req.file.path;
        res.json({ imageUrl });
    }
    catch (error) {
        console.error("Erreur lors de l'upload :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
}));
// Configurer Apollo Server
// @ts-nocheck
const server = new apollo_server_express_1.ApolloServer({
    typeDefs: shemas_1.typeDefs,
    resolvers: resolvers_1.resolvers,
    context: ({ req }) => {
        console.log("Utilisateur authentifié :", req.user);
        return { user: req.user || null };
    },
});
// Planifier l'exécution de la vérification tous les jours à 8h00 du matin: 0 8 * * *
node_cron_1.default.schedule("0 8 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // * * * * * pour tester toutes les minutes
    console.log("Vérification des événements du jour...");
    // Récupérer tous les utilisateurs avec leurs tokens Expo
    const [users] = yield db_1.default.promise().query(`
    SELECT id, expo_token FROM users WHERE expo_token IS NOT NULL
  `);
    // Pour chaque utilisateur, envoyer des notifications
    for (const user of users) {
        console.log(`Envoi des notifications à l'utilisateur ${user.id}`);
        // Récupérer les événements du jour pour cet utilisateur
        const [events] = (yield db_1.default.promise().query(`
      SELECT * FROM reptile_events WHERE user_id = ? AND DATE(event_date) = CURDATE()
    `, [user.id]));
        // Si des événements sont trouvés pour cet utilisateur aujourd'hui, envoyer une notification
        if (events.length > 0) {
            const message = {
                body: `Vous avez ${events.length} événement(s) aujourd'hui !`,
                data: { events }, // Ajoutez des données supplémentaires si nécessaire
            };
            const notificationMessage = `Vous avez ${events.length} événement(s) aujourd'hui !`;
            const notificationQuery = `
        INSERT INTO notifications (user_id, message, sent, \`read\`) 
        VALUES (?, ?, ?, ?)
      `;
            yield db_1.default
                .promise()
                .query(notificationQuery, [user.id, notificationMessage, false, false])
                .catch((error) => {
                console.error("Erreur lors de l'insertion de la notification :", error);
            });
            // Appeler la fonction sendDailyNotifications pour envoyer la notification
            (_a = (0, notificationService_1.sendDailyNotifications)(user.expo_token, message)) === null || _a === void 0 ? void 0 : _a.catch((error) => {
                console.error("Erreur lors de l'envoi de la notification :", error);
            });
        }
    }
}));
// Fonction pour démarrer le serveur
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        // Démarrage d'Apollo Server
        yield server.start();
        // Lier Apollo Server avec Express via le middleware
        server.applyMiddleware({ app, path: "/graphql" });
        // Démarrage du serveur Express
        app.listen(port, () => {
            console.log(`🚀 Serveur démarré sur http://localhost:${port}${server.graphqlPath}`);
        });
    });
}
// Lancer le serveur
startServer().catch((error) => {
    console.error("Erreur lors du démarrage du serveur :", error);
});
