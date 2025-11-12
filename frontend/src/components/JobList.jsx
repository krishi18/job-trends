import React, { useState, useEffect } from "react";
import {
  DataGrid,
  // --- Import the building blocks ---
  GridToolbarContainer,
  GridToolbarQuickFilter,
  GridToolbarColumnsButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
} from "@mui/x-data-grid";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";

// How many jobs to fetch? Set a reasonable max for client-side processing
const FETCH_LIMIT = 10000;

// --- 1. Create a Custom Toolbar component ---
// This adds the Quick Filter search bar and keeps the other buttons
function CustomToolbar() {
  return (
    <GridToolbarContainer
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 16px",
      }}
    >
      {/* Box for the standard buttons (Columns, Density, Export) */}
      <Box>
        <GridToolbarColumnsButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport />
      </Box>
      {/* --- This is the obvious filter search bar --- */}
      <GridToolbarQuickFilter
        sx={{
          width: "40%",
          minWidth: "300px",
          "& .MuiInputBase-root": {
            fontSize: "0.9rem",
          },
        }}
      />
    </GridToolbarContainer>
  );
}

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Simplified fetchJobs to get ALL jobs (up to the limit)
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/jobs?skip=0&limit=${FETCH_LIMIT}`
      );
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Run fetchJobs only once on component mount
  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;

    try {
      // 1. Delete from server
      await fetch(`http://127.0.0.1:8000/jobs/${id}`, { method: "DELETE" });

      // 2. Remove from local state (faster than re-fetching)
      setJobs((prevJobs) => prevJobs.filter((job) => job.Job_ID !== id));
    } catch (err) {
      console.error("Error deleting job:", err);
    }
  };

  const columns = [
    { field: "Job_ID", headerName: "ID", width: 70 },
    { field: "Job_Title", headerName: "Title", flex: 1, minWidth: 200 },
    {
      field: "Salary_USD",
      headerName: "Salary (USD)",
      width: 130,
      type: "number",
    },
    { field: "Experience_Level", headerName: "Experience", width: 130 },
    { field: "Employment_Type", headerName: "Type", width: 130 },
    {
      field: "actions",
      headerName: "Actions",
      width: 180,
      renderCell: (params) => (
        <Box>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => navigate(`/edit/${params.row.Job_ID}`)}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => handleDelete(params.row.Job_ID)}
          >
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Job Listings
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <DataGrid
          rows={jobs}
          columns={columns}
          getRowId={(row) => row.Job_ID}
          pageSizeOptions={[25, 50, 100]}
          
          // --- 2. Use your CustomToolbar component ---
          slots={{ toolbar: CustomToolbar }} // <-- THIS IS THE CHANGE

          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
          }}
          autoHeight
          disableRowSelectionOnClick
          sx={{
            backgroundColor: "white",
            borderRadius: 2,
            boxShadow: 2,
            "& .MuiDataGrid-cell": { fontSize: "0.9rem" },
            // Make header bold
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f5f5f5",
              fontWeight: "bold",
            },
          }}
        />
      )}
    </Box>
  );
}