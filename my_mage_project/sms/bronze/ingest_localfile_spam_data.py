# Local File Ingestion to PostgreSQL Bronze Layer
import os
import pandas as pd
from sqlalchemy import create_engine, text

POSTGRES_URI = "postgresql://postgres:postgres@localhost:5432/sms"
FILE_PATH = "/Users/santhoshsl/Custom_GUI_Airflow/my_mage_project/sms/bronze/data/spam_data.csv"

# Docker DNS and filepath overrides
if os.getenv("DOCKER_ENV") == "true":
    POSTGRES_URI = POSTGRES_URI.replace("localhost", "host.docker.internal")
    FILE_PATH = "/home/src/my_mage_project/sms/bronze/data/spam_data.csv"

def run_etl():
    print(f"🔌 Connecting to PostgreSQL destination and reading local file: {FILE_PATH}...")
    
    if not os.path.exists(FILE_PATH):
        raise FileNotFoundError(f"Source file not found at: {FILE_PATH}")
        
    print("📥 Reading data from local file...")
    file_ext = os.path.splitext(FILE_PATH)[1].lower()
    
    if file_ext == ".parquet":
        df = pd.read_parquet(FILE_PATH)
    else:
        # Sniff delimiter and check if the first line represents data or header
        with open(FILE_PATH, "r", encoding="utf-8") as f:
            first_line = f.readline()
            
        sep = "\t" if "\t" in first_line else ","
        
        # Check if the first value in the first column is a known data label ("ham" or "spam")
        first_val = first_line.split(sep)[0].strip().lower()
        if first_val in ["ham", "spam"]:
            # Headerless SMS spam dataset: assign standard column names
            df = pd.read_csv(FILE_PATH, sep=sep, header=None, names=["label", "message"])
        else:
            # File has headers or is a generic delimited text file
            df = pd.read_csv(FILE_PATH, sep=sep)
        
    if df.empty:
        print("⚠️ File is empty. Ingestion finished.")
        return

    # Clean object structures and convert column names to lowercase
    for col in df.columns:
        if df[col].dtype == "object":
            df[col] = df[col].apply(lambda x: str(x) if x is not None and not pd.isna(x) else None)
            
    df.columns = [c.lower() for c in df.columns]

    print("📤 Loading records into postgres: sms_bronze.spam_data...")
    pg_engine = create_engine(POSTGRES_URI)
    
    # Check if table exists first
    table_exists = False
    try:
        with pg_engine.connect() as conn:
            result = conn.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'sms_bronze' AND table_name = 'spam_data');"))
            table_exists = result.scalar()
    except Exception:
        pass

    with pg_engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS sms_bronze;"))
        if table_exists:
            conn.execute(text("TRUNCATE TABLE sms_bronze.spam_data CASCADE;"))
        df.to_sql(name="spam_data", con=conn, schema="sms_bronze", if_exists="append", index=False)
        print(f"✅ Successfully loaded {len(df)} records.")

if __name__ == "__main__":
    try:
        run_etl()
    except Exception as e:
        print(f"❌ Ingestion failed: {e}")
