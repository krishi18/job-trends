import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./analytics-d3.css"; // Make sure to create this CSS file

const BASE = "http://127.0.0.1:8000";
const MAX_FETCH = 10000;

// Candidate keys (case-insensitive attempts)
const CANDIDATES = {
  salary: ["Salary_USD", "salary_usd", "salaryInUSD", "salary_in_usd", "salary", "Salary"],
  employment: ["Employment_Type", "employment_type", "employmentType", "EmploymentType", "employment"],
  location: ["Location", "location", "company_location", "companyLocation", "Company", "employee_residence", "employeeResidence"],
  role: ["Job_Role", "job_role", "Job_Title", "job_title", "title", "Role"] // <-- ADDED
};

function pickField(obj, candidates) {
  if (!obj) return null;
  const keys = Object.keys(obj);
  const lowerKeys = keys.reduce((acc, k) => { acc[k.toLowerCase()] = k; return acc; }, {});
  for (let c of candidates) {
    const lower = c.toLowerCase();
    if (lowerKeys[lower]) return lowerKeys[lower]; // return actual key name present in object
  }
  // fallback: if object has obvious keys
  for (let k of ["salary", "employment", "location", "role"]) {
    if (lowerKeys[k]) return lowerKeys[k];
  }
  return null;
}

// fetch jobs (single call). We use skip=0&limit=MAX_FETCH
async function fetchJobs(limit = MAX_FETCH) {
  const url = `${BASE}/jobs?skip=0&limit=${limit}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fetch failed ${res.status}: ${text}`);
  }
  const jobs = await res.json();
  if (!Array.isArray(jobs)) throw new Error("Unexpected response shape from /jobs (expected array)");
  return jobs;
}

// --- Aggregation Helpers ---

// Aggregates by key and returns counts
function aggregateCounts(arr, key) {
  const counts = new Map();
  for (const r of arr) {
    let v = r[key];
    if (v === null || v === undefined || v === "") v = "Unknown";
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  // REFACTORED: Use 'value' instead of 'count'
  const out = [...counts.entries()].map(([label, count]) => ({ label, value: count }));
  out.sort((a,b)=>b.value-a.value); // Sort by 'value'
  return out;
}

// NEW: Aggregates by key and returns average salary
function aggregateAverageSalary(arr, keyField, salaryField) {
  const stats = new Map();
  const salaryKey = salaryField;
  const groupKey = keyField;

  if (!groupKey || !salaryKey) return [];

  for (const r of arr) {
    let group = r[groupKey];
    if (group === null || group === undefined || group === "") group = "Unknown";
    
    const val = numeric(r[salaryKey]);
    if (Number.isNaN(val) || !Number.isFinite(val)) continue;

    const current = stats.get(group) || { sum: 0, count: 0 };
    stats.set(group, {
      sum: current.sum + val,
      count: current.count + 1,
    });
  }

  const out = [];
  for (const [label, data] of stats.entries()) {
    if (data.count > 0) {
      out.push({
        label,
        value: data.sum / data.count, // 'value' is our average salary
        count: data.count // keep 'count' for tooltips or filtering
      });
    }
  }
  
  out.sort((a,b)=>b.value-a.value); // Sort by highest average salary
  return out;
}

function numeric(x) {
  if (x === null || x === undefined) return NaN;
  if (typeof x === "number") return x;
  const s = String(x).replace(/[^0-9.\-]/g,""); // strip currency symbols, commas
  return Number(s);
}

// Main component
export default function Analytics3D() {
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [fields, setFields] = useState({ 
    salary: null, 
    employment: null, 
    location: null, 
    role: null // <-- ADDED
  });

  // Refs for SVG containers
  const donutRef = useRef();
  const barRef = useRef();
  const histRef = useRef();

  // --- Data Fetching Effect ---
  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const data = await fetchJobs(MAX_FETCH);
        if (!mounted) return;
        setJobs(data);

        // auto-detect fields from first non-empty row
        let sample = data.find(Boolean) || {};
        const salaryKey = pickField(sample, CANDIDATES.salary);
        const empKey = pickField(sample, CANDIDATES.employment);
        const locKey = pickField(sample, CANDIDATES.location);
        const roleKey = pickField(sample, CANDIDATES.role); // <-- ADDED

        setFields({ 
          salary: salaryKey, 
          employment: empKey, 
          location: locKey, 
          role: roleKey // <-- ADDED
        });
        setStatus("ready");
      } catch (err) {
        if (!mounted) return;
        setError(err.message || String(err));
        setStatus("error");
      }
    })();

    return () => { mounted = false };
  }, []);

  // --- Drawing Effect ---
  useEffect(() => {
    if (status !== "ready") return;

    // employment donut
    try {
      const empKey = fields.employment;
      const empData = empKey ? aggregateCounts(jobs, empKey) : [];
      drawDonut(donutRef, empData, { title: "Employment type" });
    } catch (e) {
      console.error("donut draw err", e);
    }

    // Avg Salary by Job Role bar
    try {
      const roleKey = fields.role;
      const salaryKey = fields.salary;
      // Use our new function!
      const salaryData = aggregateAverageSalary(jobs, roleKey, salaryKey).slice(0, 12); // Get top 12
      
      // Use the same bar drawing function!
      drawHorizontalBar(barRef.current, salaryData, { title: "Average Salary by Job Role (Top 12)" });
    } catch (e) {
      console.error("bar draw err", e);
    }

    // salary histogram
    try {
      const salaryKey = fields.salary;
      const vals = [];
      if (salaryKey) {
        for (const r of jobs) {
          const n = numeric(r[salaryKey]);
          if (!Number.isNaN(n) && Number.isFinite(n)) vals.push(n);
        }
      }
      drawHistogram(histRef.current, vals, { title: "Salary distribution (USD)", buckets: 20 });
    } catch (e) {
      console.error("hist draw err", e);
    }

  }, [status, jobs, fields]);

  // --- Render ---
  return (
    <div className="analytics-3d-wrap">
      <header className="analytics-header">
        <h2>Analytics — Jobs</h2>
        <div className="summary">
          <div><strong>Total fetched:</strong> {jobs.length}</div>
          <div><strong>Detected fields:</strong>
            <small> salary: <em>{fields.salary || "none"}</em>,</small>
            <small> employment: <em>{fields.employment || "none"}</em>,</small>
            <small> location: <em>{fields.location || "none"}</em>,</small>
            <small> role: <em>{fields.role || "none"}</em></small>
          </div>
        </div>
      </header>

      {status === "loading" && <div className="loading">Loading jobs and building charts…</div>}
      {status === "error" && <div className="err">Error: {error}</div>}

      {status === "ready" && (
        <div className="dashboard-grid">
          <div className="card donut-card">
            <h3>Employment Type</h3>
            {fields.employment ? <svg ref={donutRef} className="chart-svg" /> : <div className="hint">Employment type field not detected.</div>}
          </div>

          <div className="card bar-card">
            <h3>Average Salary by Job Role</h3>
            {(fields.role && fields.salary) ? <svg ref={barRef} className="chart-svg" /> : <div className="hint">Job Role or Salary field not detected.</div>}
          </div>

          <div className="card hist-card">
            <h3>Salary Distribution</h3>
            {fields.salary ? <svg ref={histRef} className="chart-svg" /> : <div className="hint">Salary field not detected or non-numeric.</div>}
          </div>
        </div>
      )}

      <footer className="analytics-footer small">
        Note: this visualization fetches up to {MAX_FETCH} jobs from <code>/jobs</code>.
      </footer>
    </div>
  );
}

/* ---------- Drawing Helpers (with Animations) ---------- */

function drawDonut(ref, data, opts = {}) {
  const svgEl = ref.current || ref;
  if (!svgEl) return;
  const width = 560,
    height = 360,
    radius = Math.min(width, height) / 2 - 12;
  const svg = d3.select(svgEl);
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  if (!data || data.length === 0) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("class", "hint")
      .text("No data");
    return;
  }

  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);
  const color = d3
    .scaleOrdinal()
    .domain(data.map((d) => d.label))
    .range(d3.schemeTableau10);

  const pie = d3
    .pie()
    .sort(null)
    .value((d) => d.value); // Use 'value'
  const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);
  g
    .selectAll("path")
    .data(pie(data))
    .enter()
    .append("path")
    .attr("fill", (d) => color(d.data.label))
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .on("mouseenter", function (e, d) {
      d3.select(this).transition().duration(150).attr("transform", "scale(1.03)");
      showTooltip(svgEl, `${d.data.label}: ${d.data.value}`);
    })
    .on("mouseleave", function () {
      d3.select(this).transition().duration(150).attr("transform", "scale(1)");
      hideTooltip(svgEl);
    })
    .transition()
    .duration(750)
    .delay((d, i) => i * 50)
    .attrTween("d", (d) => {
      const i = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
      return (t) => arc(i(t));
    });

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .attr("class", "donut-center")
    .text(d3.sum(data, (d) => d.value)); // Use 'value'

  const legend = svg
    .append("g")
    .attr("transform", `translate(12, 24)`);
  const legendItems = legend
    .selectAll("g")
    .data(data.slice(0, 10))
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(0,${i * 20})`);
  legendItems
    .append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("rx", 3)
    .attr("fill", (d) => color(d.label));
  legendItems
    .append("text")
    .attr("x", 18)
    .attr("y", 12)
    .text((d) => `${d.label} (${d.value})`) // Use 'value'
    .attr("class", "legend-item");
}

function drawHorizontalBar(element, data, opts = {}) {
  const svgEl = element;
  if (!svgEl) return;
  const width = 520,
    height = 420;
  const margin = { top: 26, right: 20, bottom: 40, left: 160 };
  const svg = d3.select(svgEl);
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  if (!data || data.length === 0) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("class", "hint")
      .text("No data");
    return;
  }

  // REFACTORED: Use 'd.value'
  const max = d3.max(data, (d) => d.value) || 1;
  const y = d3
    .scaleBand()
    .domain(data.map((d) => d.label).reverse())
    .range([margin.top, height - margin.bottom])
    .padding(0.15);
  const x = d3
    .scaleLinear()
    .domain([0, max])
    .nice()
    .range([margin.left, width - margin.right]);

  svg
    .append("g")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("y", (d) => y(d.label))
    .attr("height", y.bandwidth())
    .attr("class", "bar")
    .attr("x", margin.left)
    .attr("width", 0)
    .transition()
    .duration(750)
    .delay((d, i) => i * 30)
    .attr("width", (d) => Math.max(0, x(d.value) - margin.left)); // Use 'd.value'

  svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left - 6},0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call((g) => g.select(".domain").remove());

  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(opts.title || "Bar");
}

function drawHistogram(element, values, opts = {}) {
  const svgEl = element;
  if (!svgEl) return;
  const width = 900,
    height = 420;
  const margin = { top: 28, right: 14, bottom: 80, left: 60 };
  const svg = d3.select(svgEl);
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  if (!values || values.length === 0) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("class", "hint")
      .text("No numeric salary data");
    return;
  }

  const buckets = opts.buckets || 20;
  const x = d3
    .scaleLinear()
    .domain(d3.extent(values))
    .nice()
    .range([margin.left, width - margin.right]);
  const histogram = d3
    .bin()
    .domain(x.domain())
    .thresholds(buckets)(values);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(histogram, (d) => d.length)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .selectAll("rect")
    .data(histogram)
    .join("rect")
    .attr("x", (d) => x(d.x0) + 1)
    .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("class", "bar")
    .attr("y", y(0))
    .attr("height", 0)
    .transition()
    .duration(750)
    .delay((d, i) => i * 20)
    .attr("y", (d) => y(d.length))
    .attr("height", (d) => Math.max(0, y(0) - y(d.length)));

  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3.axisBottom(x).ticks(8).tickFormat(d3.format(",.0f")).tickSizeOuter(0)
    )
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6));

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(opts.title || "Histogram");
}

/* ---------- simple tooltip helpers (DOM) ---------- */
function showTooltip(svgEl, text) {
  let root = svgEl.ownerDocument || document;
  let tip = root.getElementById("__analytics_tooltip");
  if (!tip) {
    tip = root.createElement("div");
    tip.id = "__analytics_tooltip";
    tip.style.position = "fixed";
    tip.style.pointerEvents = "none";
    tip.style.padding = "6px 8px";
    tip.style.background = "rgba(0,0,0,0.75)";
    tip.style.color = "#fff";
    tip.style.borderRadius = "6px";
    tip.style.fontSize = "12px";
    tip.style.zIndex = "100";
    root.body.appendChild(tip);
  }
  tip.textContent = text;
  tip.style.display = "block";
  // crude position
  tip.style.left = (window.innerWidth * 0.5) + "px";
  tip.style.top = (window.innerHeight * 0.2) + "px";
}

function hideTooltip(svgEl) {
  const tip = document.getElementById("__analytics_tooltip");
  if (tip) tip.style.display = "none";
}