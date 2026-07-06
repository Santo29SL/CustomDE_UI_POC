# MongoDB Ingestion to PostgreSQL Bronze Layer
import os
import pandas as pd
from pymongo import MongoClient
from sqlalchemy import create_engine, text

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/expendsave")
POSTGRES_URI = os.getenv("POSTGRES_URI", "postgresql://postgres:postgres@localhost:5432/expendsave")

# Docker DNS overrides
if os.getenv("DOCKER_ENV") == "true":
    MONGO_URI = MONGO_URI.replace("localhost", "host.docker.internal")
    POSTGRES_URI = POSTGRES_URI.replace("localhost", "host.docker.internal")

def run_etl():
    print("🔌 Connecting to MongoDB source and PostgreSQL destination...")
    mongo_client = MongoClient(MONGO_URI)
    db_name = MONGO_URI.split("/")[-1].split("?")[0] or "slinventoryDB"
    collection = mongo_client[db_name]["users"]
    
    print("📥 Reading data from collection: users...")
    df = pd.DataFrame(list(collection.find({})))
    if df.empty:
        print("⚠️ Collection is empty. Ingestion finished.")
        return

    # Clean MongoDB _id and object structures
    if "_id" in df.columns:
        df["_id"] = df["_id"].astype(str)
    for col in df.columns:
        if df[col].dtype == "object":
            df[col] = df[col].apply(lambda x: str(x) if x is not None and not pd.isna(x) else None)
            
    df.columns = [c.lower() for c in df.columns]

    print("📤 Loading records into postgres: expendsave_bronze.users...")
    pg_engine = create_engine(POSTGRES_URI)
    
    # Check if table exists first
    table_exists = False
    try:
        with pg_engine.connect() as conn:
            result = conn.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'expendsave_bronze' AND table_name = 'users');"))
            table_exists = result.scalar()
    except Exception:
        pass

    with pg_engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS expendsave_bronze;"))
        if table_exists:
            conn.execute(text("TRUNCATE TABLE expendsave_bronze.users CASCADE;"))
        df.to_sql(name="users", con=conn, schema="expendsave_bronze", if_exists="append", index=False)
        print(f"✅ Successfully loaded {len(df)} records.")

if __name__ == "__main__":
    try:
        run_etl()
    except Exception as e:
        print(f"❌ Ingestion failed: {e}")
