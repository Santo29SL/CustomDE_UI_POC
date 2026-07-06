import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import col

# Initialize Spark
spark = SparkSession.builder \
    .appName("Fact_Patient_Consultations") \
    .getOrCreate()

# Connection Details
postgres_uri = "postgresql://postgres:postgres@localhost:5432/expendsave"
if os.getenv("DOCKER_ENV") == "true":
    postgres_uri = postgres_uri.replace("localhost", "host.docker.internal")

clean_uri = postgres_uri.replace("postgresql://", "")
creds, host_db = clean_uri.split("@")
user, password = creds.split(":")
host_port, db = host_db.split("/")
jdbc_url = f"jdbc:postgresql://{host_port}/{db}"

# Read Silver Staging Tables
conv_df = spark.read.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "healthcare_silver.stg_conversations") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .load()

med_df = spark.read.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "healthcare_silver.stg_medicalprofiles") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .load()

# Join on user_id and filter only patient ('user') logs
joined_df = conv_df.filter(col("user_role") == "user") \
    .join(med_df, "user_id", "left") \
    .select(
        col("conversation_id"),
        col("user_id"),
        col("blood_group"),
        col("allergies"),
        col("message_content").alias("symptom_message"),
        col("created_at")
    )

# Write to Gold Schema
joined_df.write.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "healthcare_gold.fact_patient_consultations") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .mode("overwrite") \
    .save()

print("✅ Successfully generated fact_patient_consultations.")
