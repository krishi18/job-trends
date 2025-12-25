import uvicorn
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload
from db import SessionLocal, engine
import models
import schemas

print("\n🚀 Starting Job Trends API...\n")

try:
    models.Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
except Exception as e:
    print(f"⚠️ Error: {e}")

app = FastAPI(title="Job Trends API", version="1.0.0")

# CORS - Allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    try:
        db = SessionLocal()
        return db
    except Exception as e:
        print(f"❌ DB Connection Error: {e}")
        return None

@app.get("/")
def read_root():
    return {"message": "Job Trends API is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    """Health check endpoint to verify database connectivity"""
    db = get_db()
    if not db:
        return {"status": "error", "message": "Database connection failed"}
    try:
        count = db.query(models.Job).count()
        print(f"💚 Health check: {count} jobs in database")
        return {"status": "healthy", "jobs": count, "message": "Database connected"}
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@app.get("/analytics/summary")
def get_analytics_summary():
    """Get analytics summary data for dashboard"""
    print("\n📊 Analytics summary request received")
    defaults = {
        "total_jobs": 0, 
        "avg_salary": 0, 
        "top_skills": [],
        "salary_trend": [], 
        "work_setting": [], 
        "company_size": []
    }
    
    db = get_db()
    if not db:
        print("❌ Database connection failed")
        return defaults

    try:
        total = db.query(models.Job).count()
        print(f"   📈 Total jobs in DB: {total}")
        
        if total == 0:
            print("⚠️ WARNING: No jobs found in database! Run seed_real_data.py")
            return defaults

        # Average salary
        avg = db.query(func.avg(models.Job.min_salary)).scalar() or 0
        print(f"   💰 Average salary: ${avg:,.0f}")
        
        # Top skills
        try:
            skills = db.query(
                models.Skill.skill_name, 
                func.count(models.job_skills.c.job_id).label("count")
            ).select_from(models.Skill).join(
                models.job_skills,
                models.Skill.skill_id == models.job_skills.c.skill_id
            ).group_by(
                models.Skill.skill_name
            ).order_by(
                func.count(models.job_skills.c.job_id).desc()
            ).limit(10).all()
            print(f"   🎯 Top skills found: {len(skills)}")
        except Exception as e:
            print(f"⚠️ Skills query error: {e}")
            skills = []
        
        # Salary trend by year
        trend = db.query(
            models.Job.work_year, 
            func.avg(models.Job.min_salary)
        ).filter(
            models.Job.work_year.isnot(None)
        ).group_by(models.Job.work_year).order_by(models.Job.work_year).all()
        print(f"   📅 Years tracked: {len(trend)}")
        
        # Work setting distribution
        w_set = db.query(
            models.Job.work_setting, 
            func.count(models.Job.job_id)
        ).filter(
            models.Job.work_setting.isnot(None)
        ).group_by(models.Job.work_setting).all()
        print(f"   🏠 Work settings: {len(w_set)}")
        
        # Company size distribution
        c_size = db.query(
            models.Job.company_size, 
            func.count(models.Job.job_id)
        ).filter(
            models.Job.company_size.isnot(None)
        ).group_by(models.Job.company_size).all()
        print(f"   🏢 Company sizes: {len(c_size)}")

        result = {
            "total_jobs": total,
            "avg_salary": int(avg),
            "top_skills": [{"name": s[0], "count": s[1]} for s in skills],
            "salary_trend": [{"year": int(s[0]), "salary": int(s[1])} for s in trend],
            "work_setting": [{"name": s[0], "count": s[1]} for s in w_set],
            "company_size": [{"name": s[0], "count": s[1]} for s in c_size]
        }
        
        print(f"✅ Analytics summary returned successfully\n")
        return result
        
    except Exception as e:
        print(f"❌ Error in analytics summary: {e}")
        import traceback
        traceback.print_exc()
        return defaults
    finally:
        db.close()

@app.get("/jobs")
def get_jobs_list(search: Optional[str] = None, skip: int = 0, limit: int = 100):
    """
    Get list of jobs with optional search and pagination.
    Returns jobs with compatibility fields for Analytics3d.jsx
    """
    print(f"\n💼 Jobs request: search='{search}', skip={skip}, limit={limit}")
    
    db = get_db()
    if not db:
        print("❌ Database connection failed")
        return []
    
    try:
        # Build query with eager loading
        q = db.query(models.Job).options(
            joinedload(models.Job.company),
            joinedload(models.Job.skills)
        )
        
        # Apply search filter if provided
        if search:
            search_pattern = f"%{search}%"
            q = q.filter(or_(
                models.Job.job_title.ilike(search_pattern),
                models.Job.location.ilike(search_pattern)
            ))
            print(f"   🔍 Searching for: '{search}'")
        
        # Get total count before pagination
        total_count = q.count()
        print(f"   📊 Found {total_count} jobs matching criteria")
        
        # Apply pagination
        jobs = q.offset(skip).limit(limit).all()
        print(f"   📦 Returning {len(jobs)} jobs (skip={skip}, limit={limit})")
        
        if len(jobs) == 0:
            print("⚠️ WARNING: Query returned 0 jobs!")
            print(f"   Total jobs in DB: {db.query(models.Job).count()}")
        
        # Convert to dict with compatibility fields
        result = []
        for job in jobs:
            job_dict = {
                # Core fields
                "job_id": job.job_id,
                "job_title": job.job_title,
                "location": job.location,
                "min_salary": job.min_salary,
                "max_salary": job.max_salary,
                "work_setting": job.work_setting,
                "work_year": job.work_year,
                "company_size": job.company_size,
                "experience_level": job.experience_level,
                "job_category": job.job_category,
                "employment_type": job.employment_type,
                
                # Compatibility aliases for Analytics3d.jsx
                "Job_Title": job.job_title,
                "Job_Role": job.job_title,
                "job_role": job.job_title,
                "title": job.job_title,
                "Role": job.job_title,
                
                "Location": job.location,
                "company_location": job.location,
                "employee_residence": job.location,
                
                "salary": job.min_salary,
                "Salary": job.min_salary,
                "Salary_USD": job.min_salary,
                "salary_usd": job.min_salary,
                "salary_in_usd": job.min_salary,
                "salaryInUSD": job.min_salary,
                
                "Employment_Type": job.employment_type,
                "employment_type": job.employment_type,
                "employmentType": job.employment_type,
                "EmploymentType": job.employment_type,
                "employment": job.employment_type,
                
                # Related data
                "company": {"company_name": job.company.company_name} if job.company else None,
                "Company": job.company.company_name if job.company else None,
                "skills": [{"skill_name": s.skill_name} for s in job.skills] if job.skills else []
            }
            result.append(job_dict)
        
        print(f"✅ Successfully returning {len(result)} jobs\n")
        return result
        
    except Exception as e:
        print(f"❌ Error fetching jobs: {e}")
        import traceback
        traceback.print_exc()
        return []
    finally:
        if db:
            db.close()

@app.post("/jobs")
def create_job(job: schemas.JobCreate):
    """Create a new job posting"""
    print(f"\n➕ Creating new job: {job.job_title}")
    
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        # Get or create company
        company = db.query(models.Company).filter_by(company_name=job.company_name).first()
        if not company:
            company = models.Company(company_name=job.company_name)
            db.add(company)
            db.commit()
            db.refresh(company)
            print(f"   🏢 Created new company: {job.company_name}")
        
        # Create job
        new_job = models.Job(
            job_title=job.job_title,
            location=job.location,
            min_salary=job.min_salary,
            max_salary=job.max_salary,
            company_id=company.company_id,
            experience_level=job.experience_level,
            work_setting=job.work_setting,
            job_category=job.job_category,
            company_size=job.company_size,
            work_year=job.work_year or 2024
        )
        
        # Add skills
        if job.skills:
            for skill_name in job.skills:
                skill = db.query(models.Skill).filter_by(skill_name=skill_name).first()
                if not skill:
                    skill = models.Skill(skill_name=skill_name)
                    db.add(skill)
                new_job.skills.append(skill)
            print(f"   🎯 Added {len(job.skills)} skills")
        
        db.add(new_job)
        db.commit()
        db.refresh(new_job)
        
        result = {
            "job_id": new_job.job_id,
            "job_title": new_job.job_title,
            "location": new_job.location,
            "min_salary": new_job.min_salary,
            "max_salary": new_job.max_salary,
            "company": {"company_name": company.company_name},
            "skills": [{"skill_name": s.skill_name} for s in new_job.skills]
        }
        
        print(f"✅ Job created successfully: ID {new_job.job_id}\n")
        return result
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating job: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.put("/jobs/{job_id}")
def update_job(job_id: int, job: schemas.JobCreate):
    """Update an existing job"""
    print(f"\n✏️ Updating job ID: {job_id}")
    
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        existing_job = db.query(models.Job).filter_by(job_id=job_id).first()
        if not existing_job:
            print(f"❌ Job {job_id} not found")
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Get or create company
        company = db.query(models.Company).filter_by(company_name=job.company_name).first()
        if not company:
            company = models.Company(company_name=job.company_name)
            db.add(company)
            db.commit()
            db.refresh(company)
        
        # Update job fields
        existing_job.job_title = job.job_title
        existing_job.location = job.location
        existing_job.min_salary = job.min_salary
        existing_job.max_salary = job.max_salary
        existing_job.company_id = company.company_id
        existing_job.experience_level = job.experience_level
        existing_job.work_setting = job.work_setting
        existing_job.job_category = job.job_category
        existing_job.company_size = job.company_size
        existing_job.work_year = job.work_year or 2024
        
        # Update skills
        existing_job.skills.clear()
        if job.skills:
            for skill_name in job.skills:
                skill = db.query(models.Skill).filter_by(skill_name=skill_name).first()
                if not skill:
                    skill = models.Skill(skill_name=skill_name)
                    db.add(skill)
                existing_job.skills.append(skill)
        
        db.commit()
        db.refresh(existing_job)
        
        result = {
            "job_id": existing_job.job_id,
            "job_title": existing_job.job_title,
            "location": existing_job.location,
            "min_salary": existing_job.min_salary,
            "max_salary": existing_job.max_salary,
            "company": {"company_name": company.company_name},
            "skills": [{"skill_name": s.skill_name} for s in existing_job.skills]
        }
        
        print(f"✅ Job {job_id} updated successfully\n")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating job: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/jobs/{job_id}")
def delete_job(job_id: int):
    """Delete a job"""
    print(f"\n🗑️ Deleting job ID: {job_id}")
    
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        job = db.query(models.Job).filter_by(job_id=job_id).first()
        if not job:
            print(f"❌ Job {job_id} not found")
            raise HTTPException(status_code=404, detail="Job not found")
        
        db.delete(job)
        db.commit()
        
        print(f"✅ Job {job_id} deleted successfully\n")
        return {"message": "Job deleted successfully", "job_id": job_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting job: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 Job Trends API Server")
    print("="*60)
    print(f"📍 URL: http://127.0.0.1:8000")
    print(f"📚 Docs: http://127.0.0.1:8000/docs")
    print(f"❤️ Health: http://127.0.0.1:8000/health")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="127.0.0.1", port=8000)
