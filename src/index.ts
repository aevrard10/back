import express, { Application } from "express";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./shemas";
import { authenticateUser, resolvers } from "./resolvers";
import cors from "cors";
import bodyParser from "body-parser";

const app: Application = express();
// Configuration des middlewares globaux

app.use(authenticateUser);
// app.use(cors()); // Autoriser les requêtes cross-origin

app.use(bodyParser.json()); // Parser les requêtes JSON

// Configurer Apollo Server

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({
    req,
  }: {
    req: { user?: any }; // Remplacez `any` par un type précis si possible
  }) => {
    console.log("Utilisateur authentifié :", req.user);
    return { user: req.user || null };
  },
});

// Fonction pour démarrer le serveur
async function startServer() {
  // Démarrage d'Apollo Server
  await server.start();

  // Lier Apollo Server avec Express via le middleware
  server.applyMiddleware({ app, path: "/graphql" });

  // Démarrage du serveur Express
  const port = 3030;
  app.listen(port, () => {
    console.log(
      `🚀 Serveur démarré sur http://localhost:${port}${server.graphqlPath}`
    );
  });
}

// Lancer le serveur
startServer().catch((error) => {
  console.error("Erreur lors du démarrage du serveur :", error);
});
