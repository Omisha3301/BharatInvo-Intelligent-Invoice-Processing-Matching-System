import { Express } from "express";
import { UserModel } from "../models/user";
import { InvoiceModel } from "../models/invoice";

export default function registerAnalyticsRoutes(app: Express) {
  app.get("/api/analytics/admin", async (req, res) => {
    try {
      const { year, month } = req.query;
      const yearNum = year ? parseInt(year as string) : undefined;
      const monthNum = month ? parseInt(month as string) : undefined; // 1-based

      // Total and active users
      const totalUsers = await UserModel.countDocuments();
      const activeUsers = await UserModel.countDocuments({ isActive: true });

      const monthMap = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];

      let response: any = {
        totalUsers,
        activeUsers,
      };

      if (monthNum && yearNum) {
        // Daily data for a specific month and year
        const startDate = new Date(yearNum, monthNum - 1, 1);
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

        const dailyAgg = await InvoiceModel.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                day: { $dayOfMonth: "$createdAt" },
                status: "$status",
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.day": 1 } },
        ]);

        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        const uploaded = Array(daysInMonth).fill(0);
        const approved = Array(daysInMonth).fill(0);
        dailyAgg.forEach(({ _id, count }) => {
          const dayIndex = _id.day - 1;
          if (_id.status === "approved") {
            approved[dayIndex] = count;
          } else {
            uploaded[dayIndex] += count; // Count all statuses for uploaded
          }
        });

        response.days = { uploaded, approved };
        response.labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
      } else if (yearNum) {
        // Monthly data for a specific year
        const startDate = new Date(yearNum, 0, 1);
        const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);

        const monthlyAgg = await InvoiceModel.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                month: { $month: "$createdAt" },
                status: "$status",
              },
              count: { $sum: 1 },
              totalAmount: { $sum: "$totalAmount" },
            },
          },
          { $sort: { "_id.month": 1 } },
        ]);

        const uploaded = Array(12).fill(0);
        const approved = Array(12).fill(0);
        const amounts = Array(12).fill(0);
        monthlyAgg.forEach(({ _id, count, totalAmount }) => {
          const monthIndex = _id.month - 1;
          if (_id.status === "approved") {
            approved[monthIndex] = count;
          } else {
            uploaded[monthIndex] += count; // Count all statuses for uploaded
          }
          amounts[monthIndex] += totalAmount;
        });

        response.months = monthMap.map((m) => `${m} ${yearNum}`);
        response.invoices = { uploaded, approved };
        response.amounts = amounts;
      } else {
        // Yearly data across all years
        const yearlyAgg = await InvoiceModel.aggregate([
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                status: "$status",
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1 } },
        ]);

        const years = [...new Set(yearlyAgg.map((item) => item._id.year))];
        const uploaded = Array(years.length).fill(0);
        const approved = Array(years.length).fill(0);
        yearlyAgg.forEach(({ _id, count }) => {
          const yearIndex = years.indexOf(_id.year);
          if (_id.status === "approved") {
            approved[yearIndex] = count;
          } else {
            uploaded[yearIndex] += count; // Count all statuses for uploaded
          }
        });

        response.years = years;
        response.invoices = { uploaded, approved };
      }

      // Additional analytics (same as original, applied to filtered data if year/month specified)
      const startDate = yearNum ? new Date(yearNum, 0, 1) : new Date(0);
      const endDate = yearNum
        ? new Date(yearNum, 11, 31, 23, 59, 59, 999)
        : new Date();

      const invoiceAgg = await InvoiceModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
      ]);

      const avgInvoiceValue =
        invoiceAgg.length > 0 ? Math.round(invoiceAgg[0].totalAmount / invoiceAgg[0].count) : 0;

      const topUploadersAgg = await InvoiceModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$uploadedBy",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 3 },
      ]);

      const userIds = topUploadersAgg.map((u) => u._id);
      const users = await UserModel.find({ id: { $in: userIds } });
      const topUploaders = topUploadersAgg.map((u) => {
        const user = users.find((user) => user.id === u._id);
        return {
          name: user?.name || "Unknown",
          count: u.count,
        };
      });

      const statusAgg = await InvoiceModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const statusBreakdown: Record<string, number> = {
        pending: 0,
        approved: 0,
        rejected: 0,
        paid: 0,
      };

      statusAgg.forEach((s) => {
        if (statusBreakdown.hasOwnProperty(s._id)) {
          statusBreakdown[s._id] = s.count;
        }
      });

      const mostCommonStatus = Object.entries(statusBreakdown).reduce(
        (max, curr) => (curr[1] > max[1] ? curr : max),
        ["", 0]
      )[0];

      const oldestUnpaidInvoice = await InvoiceModel.findOne({ status: "pending" })
        .sort({ createdAt: 1 })
        .lean();
      const oldestUnpaidInvoiceAge = oldestUnpaidInvoice
        ? Math.floor(
            (Date.now() - new Date(oldestUnpaidInvoice.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      // Calculate invoice growth rate for monthly data
      let invoiceGrowthRate = null;
      if (yearNum && !monthNum) {
        const uploadedInvoices = response.invoices.uploaded;
        invoiceGrowthRate =
          uploadedInvoices[10] > 0
            ? Math.round(
                ((uploadedInvoices[11] - uploadedInvoices[10]) / uploadedInvoices[10]) * 100
              )
            : 0;
      }

      res.json({
        ...response,
        statusBreakdown,
        mostCommonStatus,
        avgInvoiceValue,
        oldestUnpaidInvoiceAge,
        topUploaders,
        invoiceGrowthRate,
      });
    } catch (err) {
      console.error("Analytics Error:", err);
      res.status(500).json({ error: "Failed to fetch analytics data" });
    }
  });
}