import connection from "../index";

export const executeQuery = async (query: string, params: any[]) => {
  try {
    const [results] = await connection.promise().execute(query, params);
    return results;
  } catch (error) {
    console.error("Erreur lors de l'exécution de la requête SQL", error);
    throw new Error("Une erreur est survenue avec la base de données.");
  }
};
