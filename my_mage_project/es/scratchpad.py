from pyspark.sql import SparkSession

# Initialize a local Spark Session
print("🚀 Initializing local Spark Session...")
spark = SparkSession.builder \
    .appName("MageSparkTest") \
    .master("local[*]") \
    .getOrCreate()

# Sample dataset
data = [
    ("Alice", 28, "New York"),
    ("Bob", 35, "San Francisco"),
    ("Charlie", 23, "Seattle"),
    ("Diana", 42, "Austin")
]
columns = ["name", "age", "city"]

# Create a Spark DataFrame
print("📥 Creating Spark DataFrame...")
df = spark.createDataFrame(data, schema=columns)

# Perform a quick transformation (Filter by age > 25)
print("⚡ Filtering records where age > 25...")
filtered_df = df.filter(df.age > 25)

# Output Spark dataframe details to terminal logs
print("\n📋 DataFrame Schema:")
filtered_df.printSchema()

print("\n📊 Processed Spark DataFrame Results:")
filtered_df.show()

# Stop the Spark Session gracefully
print("🔌 Stopping Spark Session...")
spark.stop()
print("✅ Spark Job Completed Successfully!")
