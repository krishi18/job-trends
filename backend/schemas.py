from pydantic import BaseModel, ConfigDict
from typing import List, Optional

# Shared properties
class JobBase(BaseModel):
    job_title: str
    location: str
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    
    # Additional fields
    company_name: Optional[str] = None  # For creating jobs
    experience_level: Optional[str] = None
    work_setting: Optional[str] = None
    work_year: Optional[int] = None
    job_category: Optional[str] = None
    company_size: Optional[str] = None

class JobCreate(JobBase):
    skills: List[str] = []

class Skill(BaseModel):
    skill_name: str
    
    model_config = ConfigDict(from_attributes=True)  # Updated for Pydantic v2

class Company(BaseModel):
    company_name: str
    
    model_config = ConfigDict(from_attributes=True)  # Updated for Pydantic v2

class JobResponse(JobBase):
    job_id: int
    company: Optional[Company] = None
    skills: List[Skill] = []

    model_config = ConfigDict(from_attributes=True)  # Updated for Pydantic v2
