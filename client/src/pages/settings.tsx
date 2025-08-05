import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User2, Bell, Globe, Palette, Shield } from "lucide-react";

// Utility function to convert audit logs to CSV
const generateAuditLogCSV = (logs: any[]): string => {
  const headers = ["ID", "User ID", "Action", "Entity Type", "Entity ID", "Details", "Timestamp"];
  const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) return "";
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = logs.map(log => [
    escapeCsvField(log.id),
    escapeCsvField(log.userId),
    escapeCsvField(log.action),
    escapeCsvField(log.entityType),
    escapeCsvField(log.entityId),
    escapeCsvField(JSON.stringify(log.details)),
    escapeCsvField(log.timestamp ? new Date(log.timestamp).toISOString() : ""),
  ].join(","));

  return [headers.join(","), ...rows].join("\n");
};

// Utility function to trigger CSV download
const downloadCSV = (csvContent: string, fileName: string) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    department: user?.department || "",
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    language: "en",
    timezone: "ist",
    theme: "light",
  });

  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["/api/settings/auto-approve"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/settings/auto-approve");
      return response.json();
    },
  });

  const { data: auditLogs, isLoading: isAuditLogsLoading } = useQuery({
    queryKey: ["/api/audit-logs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/audit-logs");
      return response.json();
    },
    enabled: user?.role === "admin",
  });

  const updateAutoApproveMutation = useMutation({
    mutationFn: async (autoApprove: boolean) => {
      const response = await apiRequest("PATCH", "/api/settings/auto-approve", { autoApprove });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/auto-approve"] });
      toast({
        title: "Success",
        description: "Auto-approve setting updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update auto-approve setting",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      if (!user) throw new Error("User not found");
      const response = await apiRequest("PATCH", `/api/users/${user.id}`, profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profile);
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(
      "userPreferences",
      JSON.stringify({
        ...preferences,
        [key]: value,
      })
    );
    toast({
      title: "Preference Updated",
      description: "Your preference has been saved",
    });
  };

  const handleDownloadAuditLogs = () => {
    if (!auditLogs || auditLogs.length === 0) {
      toast({
        title: "No Data",
        description: "No audit logs available to download",
        variant: "destructive",
      });
      return;
    }

    const csvContent = generateAuditLogCSV(auditLogs);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadCSV(csvContent, `audit-logs-${timestamp}.csv`);
    toast({
      title: "Success",
      description: "Audit logs downloaded as CSV",
    });
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure your account settings and application preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User2 className="w-5 h-5" />
                  <span>Profile Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="firstName">Full Name</Label>
                      <Input
                        id="firstName"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={profile.department}
                        onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                        placeholder="Enter your department"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={user.role.toUpperCase()}
                      disabled
                      className="bg-gray-100 dark:bg-gray-800"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Contact your administrator to change your role.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Email Notifications
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Receive notifications about invoice updates
                    </p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => handlePreferenceChange("emailNotifications", checked)}
                  />
                </div>
                <Separator />
                {user.role === "admin" && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Auto-approve matched invoices
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Automatically approve 100% matches (applies to all users)
                      </p>
                    </div>
                    <Switch
                      checked={settings?.autoApprove || false}
                      onCheckedChange={(checked) => updateAutoApproveMutation.mutate(checked)}
                      disabled={isSettingsLoading || updateAutoApproveMutation.isPending}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Localization Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Localization</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(value) => handlePreferenceChange("language", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(value) => handlePreferenceChange("timezone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ist">IST (UTC+5:30)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Account Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Account ID</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">#{user.id.toString().padStart(6, "0")}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Member Since</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Last Login</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString("en-IN")
                      : "Never"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Appearance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={preferences.theme}
                    onValueChange={(value) => handlePreferenceChange("theme", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Choose your preferred color scheme for the application.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" disabled>
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleDownloadAuditLogs}
                  disabled={user.role !== "admin" || isAuditLogsLoading || !auditLogs}
                >
                  {isAuditLogsLoading ? "Loading..." : "Download Audit Logs"}
                </Button>
                <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700" disabled>
                  Delete Account
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Contact your administrator for account changes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
