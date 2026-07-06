import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, trim, coalesce, lit

# Initialize Spark Session
spark = SparkSession.builder \
    .appName("Stg_Train") \
    .config("spark.jars.packages", "org.postgresql:postgresql:42.7.3") \
    .getOrCreate()

# Retrieve and adjust PostgreSQL connection details
postgres_uri = "postgresql://postgres:postgres@localhost:5432/expendsave"
if os.getenv("DOCKER_ENV") == "true":
    postgres_uri = postgres_uri.replace("localhost", "host.docker.internal")

# Parse connection details for JDBC format
clean_uri = postgres_uri.replace("postgresql://", "")
creds, host_db = clean_uri.split("@")
user, password = creds.split(":")
host_port, db = host_db.split("/")
jdbc_url = f"jdbc:postgresql://{host_port}/{db}"

print("📥 Reading train data from Bronze layer (traintest_bronze.train)...")
df = spark.read.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "traintest_bronze.train") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .load()

# Cleansing and transformation:
# 1. Filter out records where ID or content is null
# 2. Trim whitespace from all string columns
# 3. Handle null values in caption (coalesce to empty string)
# 4. Remove duplicate records based on train_id
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
