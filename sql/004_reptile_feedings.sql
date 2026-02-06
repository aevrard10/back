-- Table pour l'historique des repas par reptile
CREATE TABLE IF NOT EXISTS reptile_feedings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reptile_id INT NOT NULL,
  food_id INT NULL,
  food_name VARCHAR(255),
  quantity DECIMAL(10,2) DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'restant(s)',
  fed_at DATETIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reptile_feedings_reptile_id (reptile_id)
);
