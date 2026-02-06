-- Table pour stocker l'historique des photos par reptile
CREATE TABLE IF NOT EXISTS reptile_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reptile_id INT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reptile_photos_reptile_id (reptile_id)
);
