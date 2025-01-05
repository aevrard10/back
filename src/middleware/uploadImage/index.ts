import multer from "multer";
import path from "path";

// Définir le stockage des fichiers
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, "uploads/"); // Dossier où les fichiers seront stockés
  },
  filename: (req: any, file: any, cb: any) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nom unique pour chaque fichier
  },
});

// Filtrer les fichiers (pour accepter seulement les images)
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // Si c'est une image, accepter
  } else {
    cb(new Error("Seules les images sont autorisées"), false);
  }
};

// Initialiser multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de taille du fichier (5 Mo ici)
});

export default upload;
