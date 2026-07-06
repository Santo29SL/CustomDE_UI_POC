# MySQL Ingestion to PostgreSQL Bronze Layer
import os
import pandas as pd
from sqlalchemy import create_engine, text

MYSQL_URI = os.getenv("MYSQL_URI", "mysql+pymysql://root:Satlav%4076@localhost:3306/medical_profiles")
POSTGRES_URI = os.getenv("POSTGRES_URI", "postgresql://postgres:postgres@localhost:5432/expendsave")

# Docker DNS overrides
if os.getenv("DOCKER_ENV") == "true":
    MYSQL_URI = MYSQL_URI.replace("localhost", "host.docker.internal")
    POSTGRES_URI = POSTGRES_URI.replace("localhost", "host.docker.internal")

def run_etl():
    print("🔌 Connecting to MySQL source and PostgreSQL destination...")
    mysql_engine = create_engine(MYSQL_URI)
    
    print("📥 Reading from MySQL table: medical_profiles...")
    df = pd.read_sql("SELECT * FROM medical_profiles", mysql_engine)
    if df.empty:
        print("⚠️ MySQL table is empty. Ingestion finished.")
        return

    df.columns = [c.lower() for c in df.columns]

    print("📤 Loading records into postgres: healthcare_bronze.medicalprofiles...")
    pg_engine = create_engine(POSTGRES_URI)
    
    # Check if table exists first
    table_exists = False
    try:
        with pg_engine.connect() as conn:
            result = conn.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'healthcare_bronze' AND table_name = 'medicalprofiles');"))
            table_exists = result.scalar()
    except Exception:
        pass

    with pg_engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS healthcare_bronze;"))
        if table_exists:
            conn.execute(text("TRUNCATE TABLE healthcare_bronze.medicalprofiles CASCADE;"))
        df.to_sql(name="medicalprofiles", con=conn, schema="healthcare_bronze", if_exists="append", index=False)
        print(f"✅ Successfully loaded {len(df)} records.")

if __name__ == "__main__":
    try:
        run_etl()
    except Exception as e:
        print(f"❌ Ingestion failed: {e}")
