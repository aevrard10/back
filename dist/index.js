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
const node_cron_1 = __importDefault(require("node-cron"));
const cors_1 = __importDefault(require("cors"));
const notificationService_1 = require("./notifications/notificationService");
const db_1 = __importDefault(require("./db"));
const multer_1 = __importDefault(require("multer"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
app.use(resolvers_1.authenticateUser);
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)());
const port = process.env.PORT || 3030;
const upload = (0, multer_1.default)({ dest: "uploads/" });
/**
 * Upload une image sur Txipics et retourne l'URL de l'image hébergée
 */
const uploadToTxipics = (filePath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const formData = new form_data_1.default();
        formData.append("file", fs_1.default.createReadStream(filePath));
        const response = yield axios_1.default.post("https://txipics.com/api/upload", formData, {
            headers: Object.assign({}, formData.getHeaders()),
        });
        return response.data.url;
    }
    catch (error) {
        console.error("Erreur lors de l'upload sur Txipics :", error);
        return null;
    }
});
// ✅ Endpoint d'upload qui utilise Txipics
app.post("/api/file-upload", upload.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const file = req.file;
        const id = req.body.id;
        if (!file || !id) {
            return res.status(400).send("Fichier ou reptileId manquant.");
        }
        const imageUrl = yield uploadToTxipics(file.path);
        if (!imageUrl) {
            return res.status(500).send("Erreur lors de l'upload sur Txipics.");
        }
        // Supprimer le fichier temporaire après l'upload
        fs_1.default.unlinkSync(file.path);
        // Sauvegarder l'image_url dans la table reptiles
        const query = "UPDATE reptiles SET image_url = ? WHERE id = ?";
        yield db_1.default.promise().query(query, [imageUrl, id]);
        res.status(200).json({ url: imageUrl });
    }
    catch (error) {
        console.error("Erreur lors de l'upload :", error);
        res.status(500).send("Erreur lors de l'upload.");
    }
}));
// ✅ Configurer Apollo Server
const server = new apollo_server_express_1.ApolloServer({
    typeDefs: shemas_1.typeDefs,
    resolvers: resolvers_1.resolvers,
    context: ({ req }) => {
        return { user: req.user || null };
    },
});
// ✅ Planification des notifications
node_cron_1.default.schedule("0 8 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("Vérification des événements du jour...");
    const [users] = yield db_1.default.promise().query(`
    SELECT id, expo_token FROM users WHERE expo_token IS NOT NULL
  `);
    for (const user of users) {
        const [events] = (yield db_1.default.promise().query("SELECT * FROM reptile_events WHERE user_id = ? AND DATE(event_date) = CURDATE()", [user.id]));
        if (events.length > 0) {
            const message = {
                body: `Vous avez ${events.length} événement(s) aujourd'hui !`,
                data: { events },
            };
            const notificationQuery = `
        INSERT INTO notifications (user_id, message, sent, \`read\`) 
        VALUES (?, ?, ?, ?)
      `;
            yield db_1.default.promise().query(notificationQuery, [user.id, message.body, false, false]);
            (_a = (0, notificationService_1.sendDailyNotifications)(user.expo_token, message)) === null || _a === void 0 ? void 0 : _a.catch(console.error);
        }
    }
}));
// ✅ Démarrage du serveur
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield server.start();
        server.applyMiddleware({ app, path: "/graphql" });
        app.listen(port, () => {
            console.log(`🚀 Serveur sur http://localhost:${port}${server.graphqlPath}`);
        });
    });
}
startServer().catch(console.error);
