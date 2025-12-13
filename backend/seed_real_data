import pandas as pd
import os
from sqlalchemy import text
from db import SessionLocal, engine
import models

# --- CONFIGURATION ---
# Update this path if your CSV is in a different location
CSV_FILE = r"C:\Users\Krishi Thiruppathi\Downloads\jobs_data.csv"

# MAPPINGS
EXP_MAP = {'SE': 'Senior', 'MI': 'Mid-level', 'EN': 'Entry-level', 'EX': 'Executive'}
SIZE_MAP = {'L': 'Large', 'M': 'Medium', 'S': 'Small'}
CAT_SKILLS = {
    "Data Engineering": ["SQL", "Python", "Spark", "AWS"],
    "Data Science and Research": ["Python", "Machine Learning", "SQL", "Statistics"],
    "Machine Learning and AI": ["Python", "TensorFlow", "PyTorch", "AI"],
    "Data Analysis": ["SQL", "Excel", "Tableau"],
    "Leadership and Management": ["Strategy", "Management"],
    "BI and Visualization": ["PowerBI", "Tableau", "SQL"],
}

def seed_data():
    # 1. Check for CSV File
    if not os.path.exists(CSV_FILE):
        print(f"❌ ERROR: CSV file not found at: {CSV_FILE}")
        print("   Please check the path in the script.")
        return
    
    print(f"📂 Reading CSV...")
    df = pd.read_csv(CSV_FILE)

    # 2. Connect to DB
    db = SessionLocal()
    
    try:
        # --- SAFETY CHECK ---
        # Check if data already exists to avoid duplicates
        existing_jobs = db.query(models.Job).count()
        if existing_jobs > 0:
            print(f"⚠️  Database already contains {existing_jobs} jobs.")
            print("   Skipping seed to prevent duplicates. (No changes made)")
            return

        print("🌱 Database is empty. Starting seed process...")

        # ---------------------------------------------------------
        # NOTE: The DROP TABLE commands are commented out below 
        # to prevent "Hard Reset". We just ensure tables exist.
        # ---------------------------------------------------------
        # with engine.begin() as conn:
        #     conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        #     conn.execute(text("DROP TABLE IF EXISTS job_skills"))
        #     conn.execute(text("DROP TABLE IF EXISTS jobs"))
        #     ...
        
        # Ensure tables exist (Safe Create)
        models.Base.metadata.create_all(bind=engine)

        # 3. Create Skills
        print("🌱 Creating Skills...")
        all_skills = set([s for sublist in CAT_SKILLS.values() for s in sublist])
        skill_objs = {}
        for s_name in all_skills:
            # Check if skill exists (Edge case safety)
            s = db.query(models.Skill).filter_by(skill_name=s_name).first()
            if not s:
                s = models.Skill(skill_name=s_name)
                db.add(s)
            skill_objs[s_name] = s
        db.commit()

        # 4. Create Companies
        print("🌱 Creating Companies...")
        locations = df['company_location'].unique()
        comp_objs = {}
        for loc in locations:
            c_name = f"Employers in {loc}"
            c = db.query(models.Company).filter_by(company_name=c_name).first()
            if not c:
                c = models.Company(company_name=c_name)
                db.add(c)
            comp_objs[loc] = c
        db.commit()

        # 5. Insert Jobs
        print(f"🌱 Inserting {len(df)} Jobs...")
        counter = 0
        for _, row in df.iterrows():
            loc = row['company_location']
            sal = int(row['salary_in_usd'])
            
            job = models.Job(
                job_title=row['job_title'],
                location=loc,
                min_salary=int(sal * 0.9),
                max_salary=int(sal * 1.1),
                company_id=comp_objs[loc].company_id,
                
                # Mapped Columns
                experience_level=EXP_MAP.get(row['experience_level'], row['experience_level']),
                work_setting=row['work_setting'],
                work_year=row['work_year'],
                job_category=row['job_category'],
                company_size=SIZE_MAP.get(row['company_size'], row['company_size'])
            )

            # Link Skills
            cat_skills = CAT_SKILLS.get(row['job_category'], [])
            for s in cat_skills:
                # Ensure the skill object is attached to the session
                if s in skill_objs:
                    job.skills.append(skill_objs[s])
            
            db.add(job)
            counter += 1
            if counter % 500 == 0:
                print(f"   ... {counter} added")
                db.commit()

        db.commit()
        print("✅ SUCCESS! Database populated successfully.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
