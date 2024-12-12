import express, { Application } from "express";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./shemas";
import { resolvers } from "./resolvers";

const app: Application = express();
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app });

  const port = 3030;
  app.listen(port, () => {
    console.log(
      `Serveur en cours d'exécution sur http://localhost:${port}${server.graphqlPath}`
    );
  });
}

startServer();
