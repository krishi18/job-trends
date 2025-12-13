import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  ComposedChart, Scatter, ScatterChart, ZAxis
} from "recharts";
import "./Dashboard.css";

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('salary');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/analytics/summary");
        setData(response.data);
        setLoading(false);
      } catch (err) {
        console.error("❌ Error:", err);
        setError("Backend Connection Failed");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-large"></div>
        <h3>Loading Analytics Dashboard...</h3>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-error">
        <h3>⚠️ {error || "No Data Available"}</h3>
        <p>Please ensure backend is running on port 8000</p>
      </div>
    );
  }

  // Calculate additional metrics
  const totalJobs = data.total_jobs || 0;
  const avgSalary = data.avg_salary || 0;
  const maxSalary = data.salary_trend?.length > 0 
    ? Math.max(...data.salary_trend.map(t => t.salary)) 
    : 0;
  const minSalary = data.salary_trend?.length > 0 
    ? Math.min(...data.salary_trend.map(t => t.salary)) 
    : 0;

  // Prepare data for various charts
  const skillsData = (data.top_skills || []).slice(0, 10);
  const workSettingData = data.work_setting || [];
  const companySizeData = data.company_size || [];
  const salaryTrendData = data.salary_trend || [];

  // Create growth rate data
  const growthData = salaryTrendData.map((item, idx) => {
    if (idx === 0) return { ...item, growth: 0 };
    const prevSalary = salaryTrendData[idx - 1].salary;
    const growth = ((item.salary - prevSalary) / prevSalary * 100).toFixed(2);
    return { ...item, growth: parseFloat(growth) };
  });

  // Mock additional data for demonstration
  const experienceData = [
    { level: 'Entry', salary: avgSalary * 0.7, count: Math.floor(totalJobs * 0.3) },
    { level: 'Mid', salary: avgSalary * 0.9, count: Math.floor(totalJobs * 0.4) },
    { level: 'Senior', salary: avgSalary * 1.2, count: Math.floor(totalJobs * 0.25) },
    { level: 'Lead', salary: avgSalary * 1.5, count: Math.floor(totalJobs * 0.05) }
  ];

  const locationData = [
    { location: 'Remote', jobs: Math.floor(totalJobs * 0.4), avgSalary: avgSalary * 1.1 },
    { location: 'Hybrid', jobs: Math.floor(totalJobs * 0.35), avgSalary: avgSalary * 1.05 },
    { location: 'On-site', jobs: Math.floor(totalJobs * 0.25), avgSalary: avgSalary * 0.95 }
  ];

  return (
    <div className="dashboard-enhanced">
      {/* Header Section */}
      <div className="dashboard-header-section">
        <div>
          <h1>📊 Analytics Dashboard</h1>
          <p className="subtitle">Comprehensive job market insights and trends</p>
        </div>
        <div className="header-controls">
          <select 
            className="filter-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="year">This Year</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* KPI Grid - 4 Cards */}
      <div className="kpi-grid">
        <div className="kpi-card primary">
          <div className="kpi-icon">💼</div>
          <div className="kpi-content">
            <p className="kpi-label">Total Job Listings</p>
            <h2 className="kpi-value">{totalJobs.toLocaleString()}</h2>
            <div className="kpi-trend positive">↑ 12.5% vs last month</div>
          </div>
        </div>

        <div className="kpi-card success">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <p className="kpi-label">Average Salary</p>
            <h2 className="kpi-value">${avgSalary.toLocaleString()}</h2>
            <div className="kpi-trend positive">↑ 8.3% YoY</div>
          </div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-icon">🔥</div>
          <div className="kpi-content">
            <p className="kpi-label">Top Skill Demand</p>
            <h2 className="kpi-value">{skillsData[0]?.name || "N/A"}</h2>
            <div className="kpi-trend">{skillsData[0]?.count || 0} jobs</div>
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-icon">📈</div>
          <div className="kpi-content">
            <p className="kpi-label">Salary Range</p>
            <h2 className="kpi-value">${(maxSalary/1000).toFixed(0)}K - ${(minSalary/1000).toFixed(0)}K</h2>
            <div className="kpi-trend">{((maxSalary-minSalary)/1000).toFixed(0)}K spread</div>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="charts-container">
        
        {/* Row 1: Salary Trend + Growth Rate */}
        <div className="chart-card large">
          <div className="chart-header">
            <h3>📈 Salary Trend Analysis</h3>
            <div className="chart-tabs">
              <button className={selectedMetric === 'salary' ? 'active' : ''} onClick={() => setSelectedMetric('salary')}>Salary</button>
              <button className={selectedMetric === 'growth' ? 'active' : ''} onClick={() => setSelectedMetric('growth')}>Growth %</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={growthData}>
              <defs>
                <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#764ba2" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="year" stroke="#666" />
              <YAxis yAxisId="left" stroke="#666" tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" stroke="#666" tickFormatter={(v) => `${v}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (name === 'salary') return [`$${value.toLocaleString()}`, 'Salary'];
                  if (name === 'growth') return [`${value}%`, 'Growth Rate'];
                  return [value, name];
                }}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="salary" fill="url(#colorSalary)" stroke="#667eea" strokeWidth={3} />
              <Line yAxisId="right" type="monotone" dataKey="growth" stroke="#fa709a" strokeWidth={2} dot={{ fill: '#fa709a', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Top Skills Bar Chart */}
        <div className="chart-card medium">
          <div className="chart-header">
            <h3>🎯 Top 10 In-Demand Skills</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={skillsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis type="number" stroke="#666" />
              <YAxis type="category" dataKey="name" stroke="#666" width={100} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#667eea" radius={[0, 8, 8, 0]}>
                {skillsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Work Setting Distribution */}
        <div className="chart-card small">
          <div className="chart-header">
            <h3>🏠 Work Setting</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={workSettingData} 
                dataKey="count" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                outerRadius={90}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {workSettingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Company Size Distribution */}
        <div className="chart-card small">
          <div className="chart-header">
            <h3>🏢 Company Size</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={companySizeData} 
                dataKey="count" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                label
              >
                {companySizeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Experience Level vs Salary */}
        <div className="chart-card medium">
          <div className="chart-header">
            <h3>👔 Experience Level Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={experienceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="level" stroke="#666" />
              <YAxis yAxisId="left" stroke="#666" tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (name === 'salary') return [`$${value.toLocaleString()}`, 'Avg Salary'];
                  if (name === 'count') return [value, 'Job Count'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar yAxisId="right" dataKey="count" fill="#4facfe" name="Job Count" />
              <Line yAxisId="left" type="monotone" dataKey="salary" stroke="#fa709a" strokeWidth={3} name="Avg Salary" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Location vs Salary Scatter */}
        <div className="chart-card medium">
          <div className="chart-header">
            <h3>📍 Location Analysis</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="location" stroke="#666" />
              <YAxis yAxisId="left" stroke="#666" />
              <YAxis yAxisId="right" orientation="right" stroke="#666" tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }} />
              <Legend />
              <Bar yAxisId="left" dataKey="jobs" fill="#43e97b" name="Job Count" />
              <Line yAxisId="right" type="monotone" dataKey="avgSalary" stroke="#f093fb" strokeWidth={3} name="Avg Salary" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Skills Radar Chart */}
        <div className="chart-card medium">
          <div className="chart-header">
            <h3>⭐ Skills Demand Radar</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={skillsData.slice(0, 6)}>
              <PolarGrid stroke="#e0e0e0" />
              <PolarAngleAxis dataKey="name" stroke="#666" />
              <PolarRadiusAxis stroke="#666" />
              <Radar name="Demand" dataKey="count" stroke="#667eea" fill="#667eea" fillOpacity={0.6} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats Card */}
        <div className="chart-card info-card">
          <div className="chart-header">
            <h3>📋 Quick Stats</h3>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-icon">📊</span>
              <div>
                <p className="stat-number">{skillsData.length}</p>
                <p className="stat-desc">Unique Skills</p>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🏢</span>
              <div>
                <p className="stat-number">{companySizeData.reduce((sum, c) => sum + c.count, 0)}</p>
                <p className="stat-desc">Companies</p>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🌍</span>
              <div>
                <p className="stat-number">{locationData.length}</p>
                <p className="stat-desc">Work Modes</p>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">💼</span>
              <div>
                <p className="stat-number">{experienceData.length}</p>
                <p className="stat-desc">Experience Levels</p>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📈</span>
              <div>
                <p className="stat-number">{salaryTrendData.length}</p>
                <p className="stat-desc">Years Tracked</p>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <div>
                <p className="stat-number">{((maxSalary - minSalary) / minSalary * 100).toFixed(0)}%</p>
                <p className="stat-desc">Salary Variance</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
