import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  Upload as UploadIcon,
  AlertCircle,
} from "lucide-react";
import { DashboardStats, Activity } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: activity, isLoading: activityLoading } = useQuery<Activity[]>({
    queryKey: ["/api/dashboard/activity"],
  });

  const [chartData, setChartData] = useState<any>(null);
  const [metric, setMetric] = useState<"uploaded" | "approved">("uploaded");
  const [timeframe, setTimeframe] = useState<"day" | "month" | "year">("month");
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (new Date().getMonth() + 1).toString().padStart(2, "0")
  );

  useEffect(() => {
    let url = "http://localhost:5000/api/analytics/admin";
    if (timeframe === "day") {
      url += `?year=${selectedYear}&month=${selectedMonth}`;
    } else if (timeframe === "month") {
      url += `?year=${selectedYear}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((json) => setChartData(json))
      .catch((err) => console.error("Error loading data", err));
  }, [timeframe, selectedYear, selectedMonth]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getChartData = () => {
    if (!chartData) return [];

    if (timeframe === "year") {
      return chartData.years?.map((year: string, i: number) => ({
        name: year,
        value: chartData.invoices[metric][i] || 0,
      })) || [];
    } else if (timeframe === "month") {
      return chartData.months?.map((month: string, i: number) => ({
        name: month.split(" ")[0], // Extract month name
        value: chartData.invoices[metric][i] || 0,
      })) || [];
    } else {
      return chartData.labels?.map((day: string, i: number) => ({
        name: day,
        value: chartData.days[metric][i] || 0,
      })) || [];
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Welcome back! Here's what's happening with your invoices.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total Invoices
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {statsLoading ? "..." : stats?.totalInvoices || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Pending Review
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {statsLoading ? "..." : stats?.pendingReview || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Approved Today
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {statsLoading ? "..." : stats?.approvedToday || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Matching Accuracy
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {statsLoading ? "..." : `${stats?.accuracy || 0}%`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4 mb-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Metric
                </label>
                <Select
                  value={metric}
                  onValueChange={(value: "uploaded" | "approved") => setMetric(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uploaded">Uploaded Invoices</SelectItem>
                    <SelectItem value="approved">Approved Invoices</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Timeframe
                </label>
                <Select
                  value={timeframe}
                  onValueChange={(value: "day" | "month" | "year") =>
                    setTimeframe(value)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">Year</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {timeframe !== "year" && (
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    Year
                  </label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {["2024", "2025"].map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {timeframe === "day" && (
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    Month
                  </label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: "01", label: "January" },
                        { value: "02", label: "February" },
                        { value: "03", label: "March" },
                        { value: "04", label: "April" },
                        { value: "05", label: "May" },
                        { value: "06", label: "June" },
                        { value: "07", label: "July" },
                        { value: "08", label: "August" },
                        { value: "09", label: "September" },
                        { value: "10", label: "October" },
                        { value: "11", label: "November" },
                        { value: "12", label: "December" },
                      ].map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <BarChart width={600} height={300} data={getChartData()}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="value"
                fill="#60a5fa"
                name={metric === "uploaded" ? "Uploaded Invoices" : "Approved Invoices"}
              />
            </BarChart>
          </CardContent>
        </Card>

        {/* Additional Analytics Insights */}
        {chartData && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Advanced Analytics Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-gray-800 dark:text-gray-200">
                <p>
                  <strong>Invoice Growth Rate (MoM):</strong>{" "}
                  {chartData.invoiceGrowthRate ?? "N/A"}%
                </p>
                <p>
                  <strong>Average Invoice Value:</strong> $
                  {chartData.avgInvoiceValue?.toLocaleString() ?? "N/A"}
                </p>
                <p>
                  <strong>Oldest Pending Invoice Age:</strong>{" "}
                  {chartData.oldestUnpaidInvoiceAge !== null
                    ? `${chartData.oldestUnpaidInvoiceAge} days`
                    : "No pending invoices"}
                </p>
                <h4 className="mt-4 font-semibold">Top Invoice Uploaders</h4>
                <ul className="list-disc list-inside">
                  {chartData.topUploaders?.length > 0 ? (
                    chartData.topUploaders.map((u: any, i: number) => (
                      <li key={i}>
                        {u.name} — {u.count} invoices
                      </li>
                    ))
                  ) : (
                    <li>No uploader data</li>
                  )}
                </ul>
                <p className="mt-4">
                  <strong>Most Common Invoice Status:</strong>{" "}
                  {chartData.mostCommonStatus ?? "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex items-center space-x-4 py-3"
                  >
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                    <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      {item.description.includes("upload") ? (
                        <UploadIcon className="w-5 h-5 text-blue-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.timestamp}
                      </p>
                    </div>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}