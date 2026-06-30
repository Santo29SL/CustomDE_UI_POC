# ingest_users.py
import os
import pandas as pd
from pymongo import MongoClient
from sqlalchemy import create_engine, text

MONGO_URI = "mongodb://localhost:27017"
POSTGRES_URI = "postgresql://postgres:postgres@localhost:5432/expendsave"

# Docker DNS overrides
if os.getenv("DOCKER_ENV") == "true":
    MONGO_URI = MONGO_URI.replace("localhost", "host.docker.internal")
    POSTGRES_URI = POSTGRES_URI.replace("localhost", "host.docker.internal")

def run_etl():
    print("🔌 Connecting to local MongoDB...")
    client = MongoClient(MONGO_URI)
    
    db_name = "expendsave" 
    collection_name = "users"
    
    db = client[db_name]
    collection = db[collection_name]
    
    print(f"📥 Fetching documents from collection '{collection_name}'...")
    df = pd.DataFrame(list(collection.find({})))
    
    if df.empty:
        print(f"⚠️ Collection '{collection_name}' is empty. Ingestion finished.")
        return

    if "_id" in df.columns:
        df["_id"] = df["_id"].astype(str)
        
    for col in df.columns:
        if df[col].dtype == "object":
            df[col] = df[col].apply(lambda x: str(x) if x is not None and not pd.isna(x) else None)
            
    df.columns = [c.lower() for c in df.columns]

    target_schema = "expendsave_de_bronze"
    print(f"📤 Loading records into postgres: {target_schema}.{collection_name}...")
    
    pg_engine = create_engine(POSTGRES_URI)
    with pg_engine.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {target_schema};"))
        conn.execute(text(f"TRUNCATE TABLE {target_schema}.{collection_name} CASCADE;"))
        df.to_sql(name=collection_name, con=conn, schema=target_schema, if_exists="append", index=False)
        print(f"✅ Successfully loaded {len(df)} users records.")

if __name__ == "__main__":
    try:
        run_etl()
    except Exception as e:
        print(f"❌ Ingestion failed: {e}")
