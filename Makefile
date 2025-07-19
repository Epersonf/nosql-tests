# Variáveis
BENCH_DIR=./
DB_DIR=$(BENCH_DIR)\databases
DATA_DIR=$(BENCH_DIR)\data
TMP_DIR=$(BENCH_DIR)\tmp/

# Instala dependências Node.js (Node 18+ já deve estar no PATH)
install-deps:
	cd $(BENCH_DIR) && npm install

# Baixa e descompacta os datasets
download-data:
	cd $(BENCH_DIR) && npm run data

download-pokec:
	mkdir -p $(TMP_DIR)\downloads && \
	cd $(TMP_DIR)\downloads && \
	curl -O http://snap.stanford.edu/data/soc-pokec-profiles.txt.gz && \
	curl -O http://snap.stanford.edu/data/soc-pokec-relationships.txt.gz

import-data:
	cd $(BENCH_DIR) && arangodb/import.bat

# Executa o benchmark contra o ArangoDB
run-arangodb:
	cd $(BENCH_DIR) && node benchmark.js arangodb -a 127.0.0.1

# Executa benchmark com testes específicos
run-arangodb-tests:
	cd $(BENCH_DIR) && node benchmark.js arangodb -a 127.0.0.1 -t shortest,neighbors,singleRead

# Abre a pasta de resultados (assumindo que você salva outputs manualmente)
open-results:
	start $(BENCH_DIR)\results
