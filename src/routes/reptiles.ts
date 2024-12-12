import { Router, Request, Response } from "express";
import connection from "../db";

const router: Router = Router(); // Initialiser le router ici

// Obtenir tous les reptiles
router.get("/reptiles", (req: Request, res: Response) => {
  const query = "SELECT * FROM reptiles";
  connection.execute(query, (err, results) => {
    if (err) {
      console.error("Erreur lors de la récupération des reptiles:", err);
      return res.status(500).send("Erreur du serveur");
    }
    res.json(results);
  });
});

export default router;
