from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. CREDENTIALS
DB_USER = "root"
DB_PASS = "admin123"
DB_HOST = "127.0.0.1"
DB_PORT = 3306
DB_NAME = "job_trends"

# 2. CONNECTION STRING
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

print(f"\n >>> DEBUG: db.py is loaded. Connecting as {DB_USER} to {DB_NAME}...\n")

# 3. ENGINE with better configuration
try:
    engine = create_engine(
        DATABASE_URL, 
        pool_pre_ping=True,      # Test connection before using
        pool_recycle=3600,       # Recycle connections after 1 hour
        echo=False,              # Set True to see SQL queries (useful for debugging)
        pool_size=5,             # Number of connections to keep
        max_overflow=10          # Max additional connections when pool is full
    )
    
    # Test the connection immediately
    with engine.connect() as conn:
        print("✅ Database connection successful!")
        
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    print("\n🔧 Troubleshooting:")
    print(f"1. Is MySQL running? Test with: mysql -u {DB_USER} -p")
    print(f"2. Does database '{DB_NAME}' exist?")
    print(f"   CREATE DATABASE {DB_NAME};")
    print("3. Are credentials correct?")
    print("4. Install: pip install pymysql cryptography")
    raise

# 4. SESSION MAKER
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# 5. BASE CLASS
Base = declarative_base()

print("✅ SQLAlchemy configured successfully\n")
