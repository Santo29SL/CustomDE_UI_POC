# MySQL Workbench Ingestion to PostgreSQL Bronze Layer
import os
import pandas as pd
from sqlalchemy import create_engine, text

MYSQL_URI = "mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
POSTGRES_URI = "{POSTGRES_URI}"

# Docker DNS overrides
if os.getenv("DOCKER_ENV") == "true":
    MYSQL_URI = MYSQL_URI.replace("localhost", "host.docker.internal")
    POSTGRES_URI = POSTGRES_URI.replace("localhost", "host.docker.internal")

def run_etl():
    print("🔌 Connecting to MySQL source and PostgreSQL destination...")
    mysql_engine = create_engine(MYSQL_URI)
    
    print("📥 Reading from MySQL table: {TABLE_NAME}...")
    df = pd.read_sql("SELECT * FROM {TABLE_NAME}", mysql_engine)
    if df.empty:
        print("⚠️ MySQL table is empty. Ingestion finished.")
        return

    df.columns = [c.lower() for c in df.columns]

    print("📤 Loading records into postgres: {PROJECT}_bronze.{TABLE_NAME}...")
    pg_engine = create_engine(POSTGRES_URI)
    with pg_engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS {PROJECT}_bronze;"))
        conn.execute(text("TRUNCATE TABLE {PROJECT}_bronze.{TABLE_NAME} CASCADE"))
        df.to_sql(name="{TABLE_NAME}", con=conn, schema="{PROJECT}_bronze", if_exists="append", index=False)
        print(f"✅ Successfully loaded {len(df)} records.")

if __name__ == "__main__":
    try:
        run_etl()
    except Exception as e:
        print(f"❌ Ingestion failed: {e}")
