# Local File Ingestion to PostgreSQL Bronze Layer
import os
import pandas as pd
from sqlalchemy import create_engine, text

POSTGRES_URI = "postgresql://postgres:postgres@localhost:5432/expendsave"
FILE_PATH = "/Users/santhoshsl/Custom_GUI_Airflow/my_mage_project/traintest/bronze/data/train.csv"

# Docker DNS and filepath overrides
if os.getenv("DOCKER_ENV") == "true":
    POSTGRES_URI = POSTGRES_URI.replace("localhost", "host.docker.internal")
    FILE_PATH = "/home/src/my_mage_project/traintest/bronze/data/train.csv"

def run_etl():
    print(f"🔌 Connecting to PostgreSQL destination and reading local file: {FILE_PATH}...")
    
    if not os.path.exists(FILE_PATH):
        raise FileNotFoundError(f"Source file not found at: {FILE_PATH}")
        
    print("📥 Reading data from local file...")
    file_ext = ".csv".lower()
    
    if file_ext == ".parquet":
        df = pd.read_parquet(FILE_PATH)
    else:
        df = pd.read_csv(FILE_PATH)
        
    if df.empty:
        print("⚠️ File is empty. Ingestion finished.")
        return

    # Clean object structures and convert column names to lowercase
    for col in df.columns:
        if df[col].dtype == "object":
            df[col] = df[col].apply(lambda x: str(x) if x is not None and not pd.isna(x) else None)
            
    df.columns = [c.lower() for c in df.columns]

    print("📤 Loading records into postgres: traintest_bronze.train...")
    pg_engine = create_engine(POSTGRES_URI)
    
    # Check if table exists first
    table_exists = False
    try:
        with pg_engine.connect() as conn:
            result = conn.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'traintest_bronze' AND table_name = 'train');"))
            table_exists = result.scalar()
    except Exception:
        pass

    with pg_engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS traintest_bronze;"))
        if table_exists:
            conn.execute(text("TRUNCATE TABLE traintest_bronze.train CASCADE;"))
        df.to_sql(name="train", con=conn, schema="traintest_bronze", if_exists="append", index=False)
        print(f"✅ Successfully loaded {len(df)} records.")

if __name__ == "__main__":
    try:
        run_etl()
    except Exception as e:
        print(f"❌ Ingestion failed: {e}")
