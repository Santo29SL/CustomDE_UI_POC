import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, trim, upper, when, lower

# Initialize Spark
spark = SparkSession.builder \
    .appName("Stg_MedicalProfiles") \
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

# Read from Bronze
df = spark.read.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "healthcare_bronze.medicalprofiles") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .load()

# Standardize Blood Group and fill Allergies placeholder
clean_df = df.select(
    col("id").alias("profile_id"),
    col("user_id"),
    upper(trim(col("blood_group"))).alias("blood_group"),
    when(
        lower(trim(col("allergies"))).isin("none", "n/a", "") | col("allergies").isNull(), 
        "No Known Allergies"
    ).otherwise(trim(col("allergies"))).alias("allergies")
)

# Write to Silver Schema
clean_df.write.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "healthcare_silver.stg_medicalprofiles") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .mode("overwrite") \
    .save()

print("✅ Successfully transformed and loaded stg_medicalprofiles.")
