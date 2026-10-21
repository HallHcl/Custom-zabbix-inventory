#!/bin/bash
set -e
set -u

function create_database() {
    local database=$1
    echo "Creating database '$database' if not exists..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        SELECT 'CREATE DATABASE $database'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec
        GRANT ALL PRIVILEGES ON DATABASE $database TO $POSTGRES_USER;
EOSQL
}

if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
    echo "Multiple databases requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_database $db
    done
    echo "Multiple databases initialization completed."
fi

# Enable required extensions on dcim_db
echo "Enabling extensions uuid-ossp and vector on dcim_db..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "dcim_db" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "vector";
EOSQL
echo "Extensions successfully enabled on dcim_db."
