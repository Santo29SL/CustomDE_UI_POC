import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, max

# Initialize Spark
spark = SparkSession.builder \
    .appName("Summary_Symptom_Stats") \
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

# Read Gold Fact Table
fact_df = spark.read.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "healthcare_gold.fact_patient_consultations") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .load()

# Group by blood group and allergies to aggregate stats
agg_df = fact_df.groupBy("blood_group", "allergies") \
    .agg(
        count("conversation_id").alias("total_messages"),
        max("created_at").alias("last_message_date")
    )

# Write Summary Statistics Table to Gold
agg_df.write.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "healthcare_gold.summary_symptom_stats") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .mode("overwrite") \
    .save()

print("✅ Successfully generated summary_symptom_stats.")
