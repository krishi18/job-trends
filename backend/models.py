from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from db import Base

job_skills = Table(
    "job_skills",
    Base.metadata,
    Column("job_id", Integer, ForeignKey("jobs.job_id"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.skill_id"), primary_key=True)
)

class Company(Base):
    __tablename__ = "companies"
    company_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_name = Column(String(255), unique=True, index=True)
    jobs = relationship("Job", back_populates="company")

class Skill(Base):
    __tablename__ = "skills"
    skill_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    skill_name = Column(String(100), unique=True)
    jobs = relationship("Job", secondary=job_skills, back_populates="skills")

class Job(Base):
    __tablename__ = "jobs"
    job_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"))
    
    # Core Fields
    job_title = Column(String(255))
    location = Column(String(255))
    min_salary = Column(Integer)
    max_salary = Column(Integer)
    
    # Analytics Fields
    work_year = Column(Integer)
    job_category = Column(String(100))
    salary_currency = Column(String(10))
    salary = Column(Integer)
    salary_in_usd = Column(Integer)
    employee_residence = Column(String(255))
    experience_level = Column(String(50))
    employment_type = Column(String(50))
    work_setting = Column(String(50))
    company_size = Column(String(10))

    company = relationship("Company", back_populates="jobs")
    skills = relationship("Skill", secondary=job_skills, back_populates="jobs")
