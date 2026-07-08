import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, trim

# Initialize Spark
spark = SparkSession.builder \
    .appName("Stg_DoctorDB") \
    .config("spark.jars.packages", "org.postgresql:postgresql:42.7.3") \
    .getOrCreate()

# Retrieve and adjust PostgreSQL connection details
postgres_uri = "postgresql://postgres:postgres@localhost:5432/healthcare"
if os.getenv("DOCKER_ENV") == "true":
    postgres_uri = postgres_uri.replace("localhost", "host.docker.internal")

# Parse connection details for JDBC format
clean_uri = postgres_uri.replace("postgresql://", "")
creds, host_db = clean_uri.split("@")
user, password = creds.split(":")
host_port, db = host_db.split("/")
jdbc_url = f"jdbc:postgresql://{host_port}/{db}"

# Read from Bronze
df = spark.read.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "healthcare_bronze.doctordb") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .load()

# Perform Cleansing and Type Casting
clean_df = df.filter(col("name").isNotNull()) \
    .select(
        col("id").alias("doctor_id"),
        trim(col("name")).alias("doctor_name"),
        trim(col("specialty")).alias("specialty"),
        trim(col("phone_number")).alias("phone_number"),
        col("latitude").cast("decimal(9,6)").alias("latitude"),
        col("longitude").cast("decimal(9,6)").alias("longitude")
    )

# Write to Silver Schema
clean_df.write.format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "healthcare_silver.stg_doctordb") \
    .option("user", user) \
    .option("password", password) \
    .option("driver", "org.postgresql.Driver") \
    .mode("overwrite") \
    .save()

print("✅ Successfully transformed and loaded stg_doctordb.")
