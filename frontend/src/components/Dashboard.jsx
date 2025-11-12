import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import "./Dashboard.css"; // We will use new CSS

const BASE = "http://127.0.0.1:8000"


const MAX_FETCH = 10000; 
/**
 * NEW: Processes data for a Sunburst chart.
 * Creates a hierarchy: Experience Level -> Job Category
 */
function processDataForSunburst(jobs) {
  const hierarchy = new Map();

  // Find the key fields (handles different casings)
  const sample = jobs.find(Boolean) || {};
  const salaryKey = Object.keys(sample).find(k => k.toLowerCase() === 'salary_in_usd') || 'salary_in_usd';
  const categoryKey = Object.keys(sample).find(k => k.toLowerCase() === 'job_category') || 'job_category';
  const expKey = Object.keys(sample).find(k => k.toLowerCase() === 'experience_level') || 'experience_level';

  for (const job of jobs) {
    const exp = job[expKey] || "Unknown";
    const category = job[categoryKey] || "Unknown";
    const salary = +job[salaryKey];

    if (!hierarchy.has(exp)) {
      hierarchy.set(exp, new Map());
    }
    const categories = hierarchy.get(exp);

    if (!categories.has(category)) {
      categories.set(category, { sum: 0, count: 0 });
    }
    const stats = categories.get(category);

    if (!isNaN(salary)) {
      stats.sum += salary;
    }
    stats.count += 1;
  }

  // Convert map to D3-readable format
  const children = Array.from(hierarchy, ([expName, categories]) => {
    const catChildren = Array.from(categories, ([catName, stats]) => ({
      name: catName,
      count: stats.count,
      avgSalary: (stats.count > 0 && stats.sum > 0) ? (stats.sum / stats.count) : 0,
    }));
    return {
      name: expName,
      children: catChildren,
    };
  });

  return { name: "root", children };
}

// --- Main Dashboard Component ---

export default function Dashboard() {
  const [totalJobs, setTotalJobs] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch count
        const countRes = await fetch(`${BASE}/jobs/count`);
        if (!countRes.ok) throw new Error(`Count fetch failed: ${countRes.status}`);
        const countData = await countRes.json();
        setTotalJobs(countData.total_jobs ?? 0);

        // Fetch all jobs for the chart
        const jobsRes = await fetch(`${BASE}/jobs?skip=0&limit=${MAX_FETCH}`);
        if (!jobsRes.ok) throw new Error(`Jobs fetch failed: ${jobsRes.status}`);
        const jobsData = await jobsRes.json();
        
        if (!Array.isArray(jobsData)) {
           throw new Error("Jobs data is not an array");
        }
        
        // Use the new processing function
        const processedData = processDataForSunburst(jobsData);
        setChartData(processedData);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message);
        if (totalJobs === null) setTotalJobs("unknown"); // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="stat-card">
        <p>Total Jobs in Database</p>
        {loading && totalJobs === null ? (
          <div className="loading-spinner"></div>
        ) : (
          <h1>{totalJobs}</h1>
        )}
      </div>
      
      <div className="chart-card">
        <h3>Job Landscape by Experience & Salary</h3>
        {loading && <div className="loading-spinner"></div>}
        {error && <div className="error-message">Error: {error}</div>}
        {chartData && !loading && <SunburstChart data={chartData} />}
      </div>
    </div>
  );
}

// --- NEW Sunburst Chart Component ---

const SunburstChart = ({ data }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  
  // Refs for the text in the center
  const centerTextNameRef = useRef(null);
  const centerTextDescRef = useRef(null);

  useEffect(() => {
    if (!data) return;

    // Use the container's width, but a fixed height for simplicity
    const width = 640;
    const height = 640;
    const radius = width / 6;

    // --- 1. Create Hierarchy and Partition Layout ---
    const root = d3.hierarchy(data)
      .sum(d => d.count) // Size arcs by job count
      .sort((a, b) => b.count - a.count);

    // Propagate average salary up the tree
    root.eachAfter(d => {
      if (d.children) {
        // Weighted average
        const totalValue = d3.sum(d.children, c => c.value);
        if (totalValue > 0) {
          d.data.avgSalary = d3.sum(d.children, c => c.data.avgSalary * c.value) / totalValue;
        } else {
          d.data.avgSalary = 0;
        }
      }
    });

    const partition = d3.partition()
      .size([2 * Math.PI, radius * 5]); // [angle, radius]

    partition(root); // Apply layout

    // --- 2. Arc Generator ---
    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    // --- 3. Color Scale ---
    const allSalaries = root.descendants().map(d => d.data.avgSalary);
    const minSalary = d3.min(allSalaries) || 0;
    const maxSalary = d3.max(allSalaries) || 1;
    
    const color = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([minSalary, maxSalary]);
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
      
    // --- 4. Create SVG ---
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      // Let the CSS handle the final size
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("class", "sunburst-svg"); 

    svg.selectAll("*").remove(); // Clear previous

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // --- 5. Tooltip ---
    const tooltip = d3.select(tooltipRef.current);

    // --- 6. Draw Arcs ---
    const path = g.append("g")
      .selectAll("path")
      .data(root.descendants().slice(1)) // All but the root
      .join("path")
      .attr("d", arc)
      .attr("fill", d => (d.data.avgSalary > 0 ? color(d.data.avgSalary) : getRandomColor()))    
      .attr("class", "sunburst-arc")
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave);

    // --- 7. Center Text ---
    const centerText = g.append("text")
      .attr("class", "sunburst-center-text")
      .attr("text-anchor", "middle");

    const centerTextName = centerText.append("tspan")
      .attr("x", 0)
      .attr("dy", "-0.5em")
      .attr("class", "center-name")
      .text("Total Jobs");
      
    const centerTextDesc = centerText.append("tspan")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .attr("class", "center-desc")
      .text(d3.format(",")(root.value));

    // Store refs for functions
    centerTextNameRef.current = centerTextName;
    centerTextDescRef.current = centerTextDesc;

    // --- 8. Interaction Functions ---
    function mouseover(event, d) {
      tooltip.style("opacity", 1);
      path.attr("fill-opacity", 0.5); // Dim all arcs
      d3.select(this).attr("fill-opacity", 1); // Highlight this one
      
      // Update center text
      centerTextNameRef.current.text(d.data.name);
      centerTextDescRef.current.text(
        `Jobs: ${d3.format(",")(d.value)} `
      );
    }
    
    function mousemove(event) {
      tooltip
        .style("left", (event.pageX + 20) + "px")
        .style("top", (event.pageY) + "px")
        .html(`
          <strong>${d.data.name}</strong><br/>
          Jobs: ${d3.format(",")(d.value)}<br/>
          Avg Salary: $${d3.format(",.0f")(d.data.avgSalary)}
        `);
    }

    function mouseleave(event, d) {
      tooltip.style("opacity", 0);
      path.attr("fill-opacity", 1); // Restore all arcs
      
      // Reset center text to root
      centerTextNameRef.current.text("Total Jobs");
      centerTextDescRef.current.text(d3.format(",")(root.value));
    }

    // Clean up
    return () => {
      svg.selectAll("*").remove();
    };
  }, [data]);

  return (
    // The wrapper is now just a simple div. The CSS will size it.
    <div className="sunburst-wrapper">
      <svg ref={svgRef}></svg>
      {/* Tooltip element */}
      <div ref={tooltipRef} className="chart-tooltip"></div>
    </div>
  );
};