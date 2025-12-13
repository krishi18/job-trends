import React, { useState, useEffect } from "react";
import "./JobList.css";

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
    console.log("📡 Fetching jobs from backend...");
    
    fetch("http://127.0.0.1:8000/jobs?limit=5000")
      .then((res) => {
        console.log("Response status:", res.status);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log(`✅ Loaded ${data.length} jobs`);
        setJobs(data);
        setFilteredJobs(data);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        console.error("❌ Error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Search functionality
  useEffect(() => {
    if (jobs.length === 0) return;
    
    const filtered = jobs.filter(job => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (job.job_title && job.job_title.toLowerCase().includes(searchLower)) ||
        (job.location && job.location.toLowerCase().includes(searchLower)) ||
        (job.company?.company_name && job.company.company_name.toLowerCase().includes(searchLower)) ||
        (job.job_category && job.job_category.toLowerCase().includes(searchLower)) ||
        (job.work_setting && job.work_setting.toLowerCase().includes(searchLower))
      );
    });
    setFilteredJobs(filtered);
    setCurrentPage(1);
  }, [searchTerm, jobs]);

  // Sort functionality
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredJobs].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      if (key === 'min_salary') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredJobs(sorted);
  };

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentJobs = filteredJobs.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="joblist-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <h3>Loading Jobs...</h3>
          <p>Fetching data from backend...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="joblist-container">
        <div className="error-state">
          <h3>⚠️ Failed to load jobs. Make sure backend is running.</h3>
          <p>Error: {error}</p>
          <div className="error-instructions">
            <p><strong>Please start the backend server:</strong></p>
            <code>python app.py</code>
            <br/><br/>
            <p><strong>Test backend in browser:</strong></p>
            <a href="http://127.0.0.1:8000/jobs?limit=5" target="_blank" rel="noopener noreferrer">
              http://127.0.0.1:8000/jobs?limit=5
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="joblist-container">
        <div className="error-state">
          <h3>📊 No Jobs in Database</h3>
          <p>The database appears to be empty.</p>
          <p>Run: <code>python seed_real_data.py</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="joblist-enhanced">
      <div className="joblist-header">
        <div className="header-content">
          <h1>💼 Job Listings</h1>
          <p className="job-count">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="controls-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by title, location, company, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-btn"
              onClick={() => setSearchTerm("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="table-container">
        <table className="jobs-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('job_id')} className="sortable">
                ID {sortConfig.key === 'job_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('job_title')} className="sortable">
                Job Title {sortConfig.key === 'job_title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('min_salary')} className="sortable">
                Salary {sortConfig.key === 'min_salary' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('location')} className="sortable">
                Location {sortConfig.key === 'location' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Category</th>
              <th>Company Size</th>
              <th>Work Setting</th>
              <th>Experience</th>
            </tr>
          </thead>
          <tbody>
            {currentJobs.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-results">
                  No jobs found matching "{searchTerm}"
                </td>
              </tr>
            ) : (
              currentJobs.map((job) => (
                <tr key={job.job_id} className="job-row">
                  <td className="id-cell">{job.job_id}</td>
                  <td className="title-cell">
                    <strong>{job.job_title || 'Untitled'}</strong>
                    {job.company?.company_name && (
                      <div className="company-name">{job.company.company_name}</div>
                    )}
                  </td>
                  <td className="salary-cell">
                    {job.min_salary ? (
                      <span className="salary-badge">
                        ${job.min_salary.toLocaleString()}
                      </span>
                    ) : (
                      <span className="na">N/A</span>
                    )}
                  </td>
                  <td className="location-cell">
                    <span className="location-badge">📍 {job.location || 'Remote'}</span>
                  </td>
                  <td>
                    {job.job_category ? (
                      <span className="category-badge">{job.job_category}</span>
                    ) : (
                      <span className="na">N/A</span>
                    )}
                  </td>
                  <td>
                    <span className={`size-badge size-${job.company_size?.toLowerCase() || 'unknown'}`}>
                      {job.company_size || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`setting-badge ${job.work_setting?.toLowerCase() || ''}`}>
                      {job.work_setting || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className="exp-badge">
                      {job.experience_level || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => goToPage(1)} 
            disabled={currentPage === 1}
            className="page-btn"
          >
            « First
          </button>
          <button 
            onClick={() => goToPage(currentPage - 1)} 
            disabled={currentPage === 1}
            className="page-btn"
          >
            ‹ Prev
          </button>
          
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button 
            onClick={() => goToPage(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            Next ›
          </button>
          <button 
            onClick={() => goToPage(totalPages)} 
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            Last »
          </button>
        </div>
      )}
    </div>
  );
}
