-- Executar no BigQuery antes de importar tabelas.
FOR eixo IN (
  SELECT table_name FROM `rj-spm-rio.projeto_mapa_mulher.INFORMATION_SCHEMA.TABLES`
  WHERE table_type = 'BASE TABLE' AND REGEXP_CONTAINS(table_name, r'^eixo_(0[1-9]|1[0-2])(_|$)')
)
DO
  EXECUTE IMMEDIATE FORMAT('ALTER TABLE `rj-spm-rio.projeto_mapa_mulher.%s` ADD COLUMN IF NOT EXISTS linha_tabela INT64, ADD COLUMN IF NOT EXISTS coluna_tabela INT64', eixo.table_name);
END FOR;
