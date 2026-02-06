-- Table pour le suivi génétique par reptile
CREATE TABLE IF NOT EXISTS reptile_genetics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reptile_id INT NOT NULL,
  morph VARCHAR(255),
  mutations TEXT,
  hets TEXT,
  traits TEXT,
  lineage TEXT,
  breeder VARCHAR(255),
  hatch_date DATE,
  sire_name VARCHAR(255),
  dam_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_reptile_genetics_reptile (reptile_id),
  INDEX idx_reptile_genetics_reptile_id (reptile_id)
);
