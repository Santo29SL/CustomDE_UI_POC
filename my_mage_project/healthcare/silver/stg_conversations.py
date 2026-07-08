import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, trim

# Initialize Spark
spark = SparkSession.builder \
    .appName("Stg_Conversations") \
    .getOrCreate()

# Connection Details
postgres_uri = "postgresql://postgres:postgres@localhost:5432/healthcare"
if os.getenv("DOCKER_ENV") == "true":
    postgres_uri = postgres_uri.replace("localhost", "host.docker.internal")

clean_uri = postgres_uri.replace("postgresql://", "")
creds, host_db = clean_uri.split("@")
user, password = creds.split(":")
host_port, db = host_db.split("/")
jdbc_url = f"jdbc:postgresql://{host_port}/{db}"

# Read from Bronze
df = spark.read.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "healthcare_bronze.conversations") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .load()

# Standardize role, messages, and timestamps
clean_df = df.filter((col("message").isNotNull()) & (trim(col("message")) != "")) \
    .select(
        col("id").alias("conversation_id"),
        col("user_id"),
        trim(col("role")).alias("user_role"),
        trim(col("message")).alias("message_content"),
        col("created_at").cast("timestamp").alias("created_at")
    )

# Write to Silver Schema
clean_df.write.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "healthcare_silver.stg_conversations") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .mode("overwrite") \
    .save()

print("✅ Successfully transformed and loaded stg_conversations.")
