import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import axios from "axios";

const AttendanceChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  useEffect(() => {
    fetchChartData();
  }, [selectedPeriod]);

  const fetchChartData = async () => {
    try {
      setLoading(true);

      // Get current date
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      let response;
      if (selectedPeriod === "month") {
        response = await axios.get(
          `/attendance/monthly-summary?year=${year}&month=${month}`
        );
      } else {
        // For weekly data, we'll use the last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);

        response = await axios.get("/attendance/summary", {
          params: {
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
          },
        });
      }

      setChartData(response.data);
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = (records) => {
    if (!records) return [];

    return records.map((record) => ({
      date: new Date(record.check_in_time).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      hours: record.work_duration || 0,
      checkIn: new Date(record.check_in_time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      checkOut: record.check_out_time
        ? new Date(record.check_out_time).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Not checked out",
      status: record.check_out_time ? "Complete" : "In Progress",
    }));
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <Typography>Loading chart data...</Typography>
      </Box>
    );
  }

  if (!chartData) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  const chartRecords =
    chartData.daily_records || chartData.recent_records || [];
  const formattedData = formatChartData(chartRecords);

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">
          Attendance {selectedPeriod === "month" ? "Monthly" : "Weekly"}{" "}
          Overview
        </Typography>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={selectedPeriod}
            label="Period"
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Days
              </Typography>
              <Typography variant="h4">
                {chartData.summary?.total_days || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Hours
              </Typography>
              <Typography variant="h4">
                {chartData.summary?.total_hours || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg Hours/Day
              </Typography>
              <Typography variant="h4">
                {chartData.summary?.average_hours_per_day?.toFixed(1) || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Attendance Rate
              </Typography>
              <Typography variant="h4">
                {chartData.summary?.attendance_rate?.toFixed(1) || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Hours Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              Daily Work Hours
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [`${value}h`, "Hours"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{ fill: "#1976d2", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Status Pie Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              Work Status
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Complete",
                      value: formattedData.filter(
                        (d) => d.status === "Complete"
                      ).length,
                    },
                    {
                      name: "In Progress",
                      value: formattedData.filter(
                        (d) => d.status === "In Progress"
                      ).length,
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {[
                    {
                      name: "Complete",
                      value: formattedData.filter(
                        (d) => d.status === "Complete"
                      ).length,
                    },
                    {
                      name: "In Progress",
                      value: formattedData.filter(
                        (d) => d.status === "In Progress"
                      ).length,
                    },
                  ].map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Records Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Records
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: "auto" }}>
              {formattedData.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ddd" }}>
                      <th style={{ padding: "8px", textAlign: "left" }}>
                        Date
                      </th>
                      <th style={{ padding: "8px", textAlign: "left" }}>
                        Check In
                      </th>
                      <th style={{ padding: "8px", textAlign: "left" }}>
                        Check Out
                      </th>
                      <th style={{ padding: "8px", textAlign: "left" }}>
                        Hours
                      </th>
                      <th style={{ padding: "8px", textAlign: "left" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formattedData.slice(0, 10).map((record, index) => (
                      <tr
                        key={index}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: "8px" }}>{record.date}</td>
                        <td style={{ padding: "8px" }}>{record.checkIn}</td>
                        <td style={{ padding: "8px" }}>{record.checkOut}</td>
                        <td style={{ padding: "8px" }}>{record.hours}h</td>
                        <td style={{ padding: "8px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              backgroundColor:
                                record.status === "Complete"
                                  ? "#e8f5e8"
                                  : "#fff3cd",
                              color:
                                record.status === "Complete"
                                  ? "#155724"
                                  : "#856404",
                              fontSize: "12px",
                            }}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No attendance records found
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AttendanceChart;
