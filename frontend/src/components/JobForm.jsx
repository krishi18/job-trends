import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function JobForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Match Backend Model exactly
  const [form, setForm] = useState({
    job_title: "",
    min_salary: "",
    max_salary: "",
    location: "",
    company_name: "", // We use name for creation now
    experience_level: "",
    job_category: "",
    work_setting: "",
    company_size: ""
  });

  const isEdit = !!id;

  // If you don't have a specific "GET /jobs/{id}" endpoint in app.py yet,
  // this part might fail. But here is the correct structure.
  useEffect(() => {
    if (isEdit) {
      // Note: app.py needs a GET /jobs/{id} endpoint for this to work perfectly.
      // Currently app.py only has GET /jobs (list).
    }
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = "http://127.0.0.1:8000/jobs";
    
    // Convert numeric strings to numbers
    const payload = {
        ...form,
        min_salary: parseInt(form.min_salary) || 0,
        max_salary: parseInt(form.max_salary) || 0,
    };

    fetch(url, {
      method: "POST", // Always POST for now (Create Job)
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
          if(!res.ok) throw new Error("Failed");
          return res.json();
      })
      .then(() => navigate("/jobs"))
      .catch((err) => alert("Error: " + err));
  };

  return (
    <div className="container" style={{maxWidth: '600px', margin: '2rem auto'}}>
      <h2>{isEdit ? "Edit Job (Unavailable)" : "Add New Job"}</h2>
      <form onSubmit={handleSubmit} style={{display:'grid', gap:'1rem'}}>
        
        <label>
            Job Title: 
            <input value={form.job_title} onChange={e => setForm({...form, job_title: e.target.value})} required style={{display:'block', width:'100%', padding:'8px'}}/>
        </label>
        
        <label>
            Company Name:
            <input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} required style={{display:'block', width:'100%', padding:'8px'}}/>
        </label>

        <div style={{display:'flex', gap:'1rem'}}>
            <label style={{flex:1}}>
                Min Salary:
                <input type="number" value={form.min_salary} onChange={e => setForm({...form, min_salary: e.target.value})} required style={{display:'block', width:'100%', padding:'8px'}}/>
            </label>
            <label style={{flex:1}}>
                Max Salary:
                <input type="number" value={form.max_salary} onChange={e => setForm({...form, max_salary: e.target.value})} style={{display:'block', width:'100%', padding:'8px'}}/>
            </label>
        </div>

        <label>
            Location:
            <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} required style={{display:'block', width:'100%', padding:'8px'}}/>
        </label>

        <label>
            Category:
            <input value={form.job_category} onChange={e => setForm({...form, job_category: e.target.value})} style={{display:'block', width:'100%', padding:'8px'}}/>
        </label>
        
        <label>
            Work Setting (Remote/Hybrid/In-person):
            <input value={form.work_setting} onChange={e => setForm({...form, work_setting: e.target.value})} style={{display:'block', width:'100%', padding:'8px'}}/>
        </label>

        <button type="submit" style={{padding:'10px', background:'#007bff', color:'white', border:'none', borderRadius:'4px', cursor:'pointer'}}>Create Job</button>
      </form>
    </div>
  );
}
