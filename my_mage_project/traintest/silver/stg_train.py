import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, trim, coalesce, lit

# 1. Initialize Spark Session with PostgreSQL JDBC Driver package
spark = SparkSession.builder \
    .appName("Stg_Train") \
    .config("spark.jars.packages", "org.postgresql:postgresql:42.7.3") \
    .getOrCreate()

# 2. Configure and parse connection details dynamically
postgres_uri = "postgresql://postgres:postgres@localhost:5432/expendsave"
if os.getenv("DOCKER_ENV") == "true":
    postgres_uri = postgres_uri.replace("localhost", "host.docker.internal")

# Parse connection details for Spark JDBC compatibility
clean_uri = postgres_uri.replace("postgresql://", "")
creds, host_db = clean_uri.split("@")
user, password = creds.split(":")
host_port, db = host_db.split("/")
jdbc_url = f"jdbc:postgresql://{host_port}/{db}"

# 3. Read raw data from the Bronze Layer schema
print("📥 Reading train data from Bronze layer (traintest_bronze.train)...")
df = spark.read.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "traintest_bronze.train") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .load()

# 4. Apply cleansing and transformations:
# - Filter out rows where ID or Content is missing.
# - Cast 'id' to integer and rename to 'train_id'.
# - Trim trailing and leading whitespace from string fields.
# - Coalesce empty/null 'caption' values to empty strings.
# - Deduplicate records based on the unique key 'train_id'.
print("🧹 Cleaning and transforming dataset...")
clean_df = df.filter(col("id").isNotNull() & col("content").isNotNull()) \
    .select(
        col("id").cast("integer").alias("train_id"),
        trim(col("book_name")).alias("book_name"),
        trim(col("char")).alias("character_name"),
        coalesce(trim(col("caption")), lit("")).alias("caption"),
        trim(col("content")).alias("content"),
        trim(col("label")).alias("label")
    ) \
    .dropDuplicates(["train_id"])

# 5. Write conformed and cleaned dataset to the Silver layer (overwriting target)
print("📤 Writing cleaned dataset to Silver layer (traintest_silver.stg_train)...")
clean_df.write.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "traintest_silver.stg_train") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .mode("overwrite") \
    .save()

print("✅ PySpark Silver Cleansing finished successfully!")
