# tornado-subgraph

## Deployment

The Tornado subgraph can be deployed on all the supported TornadoCash chains.

Prerequisite is a Linux machine, preferably an LTS Ubuntu, with Docker installed, node installed and yarn installed.
You can find Docker installation instructions [over here](https://docs.docker.com/engine/install/ubuntu/).

### Deploy Graph Node

First you will need to deploy a graph node, which is later used to deploy the tornado-subgraph on.

The following docker-compose deploys an IPFS node, a graph node, a postgres instance and a traefik instance which is accessible via ports 80 and 443 from the host machine.

Make sure that you change the domain `custom-graph.domain.com` to your own, which points to the IP of the server you are deploying to.

You will need a directory with the following contents:

```tree
.
├── config.toml
├── data
├── docker-compose.yml
└── packages
```

Run the following commands to create empty directories that will be needed later:

```bash
mkdir -p ./data/ipfs
mkdir -p ./data/letsencrypt
mkdir -p ./data/postgres

mkdir -p ./packages/l1/release-data/traefik
mkdir -p ./packages/l1/release-data/traefik-keys
```

Create the file `docker-compose.yml` with the following contents (go through it and replace things to meet your needs):

```yaml
version: "3.8"

services:

  graph:
    image: graphprotocol/graph-node:v0.31.0
    user: root
    environment:
      - postgres_host=postgres
      - postgres_port=5432
      - postgres_user=graph-node
      - postgres_pass=securepassword
      - postgres_db=graph-node
      - ipfs=ipfs:5001
      - GRAPH_NODE_CONFIG=/custom-config.toml
      - node_id=primary_node
      - GRAPH_ETHEREUM_CLEANUP_BLOCKS=true
    restart: unless-stopped
    ports:
      - '8000:8000'
      - '8001:8001'
      - '8020:8020'
      - '8030:8030'
      - '8040:8040'
    depends_on:
      ipfs:
        condition: service_started
      postgres:
        condition: service_healthy
    volumes:
      - "./config.toml:/custom-config.toml"
    labels:
      - "traefik.enable=true"

      - "traefik.http.routers.http_graph.rule=Host(`custom-graph.domain.com`)"
      - "traefik.http.routers.http_graph.entrypoints=websecure"
      - "traefik.http.routers.http_graph.tls.certresolver=myresolver"
      - "traefik.http.routers.http_graph.service=http_graph_service"
      - "traefik.http.services.http_graph_service.loadbalancer.server.port=8000"

      - "traefik.http.routers.ws_graph.rule=Host(`custom-graph.domain.com`) && PathPrefix(`/ws`)"
      - "traefik.http.routers.ws_graph.middlewares=ws_graph-stripprefix"
      - "traefik.http.middlewares.ws_graph-stripprefix.stripprefix.prefixes=/ws"
      - "traefik.http.routers.ws_graph.entrypoints=websecure"
      - "traefik.http.routers.ws_graph.tls.certresolver=myresolver"
      - "traefik.http.routers.ws_graph.service=ws_graph_service"
      - "traefik.http.services.ws_graph_service.loadbalancer.server.port=8001"

  ipfs:
    image: ipfs/kubo:v0.20.0
    restart: unless-stopped
    ports:
      - '5001:5001'
    volumes:
      - ./data/ipfs:/data/ipfs

  postgres:
    image: postgres
    restart: unless-stopped
    command:
      [
        "postgres",
        "-cshared_preload_libraries=pg_stat_statements"
      ]
    environment:
      POSTGRES_USER: graph-node
      POSTGRES_PASSWORD: securepassword
      POSTGRES_DB: graph-node
      PGDATA: "/var/lib/postgresql/data"
      POSTGRES_INITDB_ARGS: "-E UTF8 --locale=C"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5

  traefik:
    image: "traefik:v2.10"
    restart: unless-stopped
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=acme@domain.org"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - "./packages/l1/release-data/traefik:/traefik"
      - "./packages/l1/release-data/traefik-keys:/traefik-keys"
      - "./data/letsencrypt:/letsencrypt"
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
```

Create a `config.toml` with the following contents (only replace RPC links, nothing else):

```toml
[store]
[store.primary]
connection = "postgresql://${postgres_user}:${postgres_pass}@${postgres_host}:${postgres_port}/${postgres_db}"
weight = 1
pool_size = 20

[chains]
ingestor = "primary_node"
[chains.mainnet]
shard = "primary"
provider = [
    { label = "mainnet", transport = "rpc", url = "https://mainnet.chainnodes.org/API_KEY", features = ["traces", "archive"] }
]
[chains.polygon]
shard = "primary"
provider = [
    { label = "polygon", transport = "rpc", url = "https://polygon-mainnet.chainnodes.org/API_KEY", features = ["traces", "archive"] }
]
[chains.bsc]
shard = "primary"
provider = [
    { label = "bsc", transport = "rpc", url = "https://bsc-mainnet.chainnodes.org/API_KEY", features = ["traces", "archive"] }
]
[chains.gnosis]
shard = "primary"
provider = [
    { label = "gnosis", transport = "rpc", url = "https://gnosis-mainnet.chainnodes.org/API_KEY", features = ["traces", "archive"] }
]
[chains.goerli]
shard = "primary"
provider = [
    { label = "goerli", transport = "rpc", url = "https://goerli.chainnodes.org/API_KEY", features = ["traces", "archive"] }
]
[chains.arbitrum-one]
shard = "primary"
provider = [
    { label = "arbitrum-one", transport = "rpc", url = "https://arbitrum-one.chainnodes.org/API_KEY", features = ["traces", "archive"] }
]
[chains.optimism]
shard = "primary"
provider = [
    { label = "optimism", transport = "rpc", url = "https://optimism-mainnet.chainnodes.org/API_KEY", features = ["traces", "archive"] }
]

[deployment]
[[deployment.rule]]
# There's no 'match', so any subgraph matches
shards = [ "primary" ]
indexers = [
    "primary_node"
]
```

If Avalanche support is needed, extend the above config accordingly and make sure to use an RPC link for Avalanche.

Double check everything and deploy with `docker compose up -d`.

### Deploy tornado-subgraph

To deploy the Ethereum Mainnet subgraph:

Now navigate to this repository (tornado-subgraph) and run the following commands:

```bash
yarn

yarn codegen:tornado-mainnet

yarn build:tornado-mainnet

npx graph create tornadocash/tornado-subgraph --node http://127.0.0.1:8020

npx graph deploy tornadocash/tornado-subgraph --ipfs http://127.0.0.1:5001 --node http://127.0.0.1:8020/ subgraphs/tornado-subgraph-mainnet.yaml
```

You might see some issues about non-existing directories like `build/` or `generated/` the first time you deploy the subgraph. If you do, simply create the directory and re-run the command that failed.

Once those commands have been run, the subgraph is deployed. In the logs you will see the link to access your subgraph. As it will likely be 127.0.0.1, you will need to replace that with the domain you chose in the previous step.

*Other chains*:

To deploy the subgraph for other chains repeat the deploy steps for `tornado-subgraph` only (no need to have multiple graph nodes).
When repeating the steps, make sure you choose a unique name in the `npx graph create` step for each chain. The representing correct yaml file for the `npx graph deploy` step can be found in the `subgraphs/` directory. Make sure to replace it accordingly.
