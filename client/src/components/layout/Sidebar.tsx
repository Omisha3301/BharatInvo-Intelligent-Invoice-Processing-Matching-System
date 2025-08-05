import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  Clock, 
  History, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "hod", "bookkeeper"] },
  { name: "Invoices", href: "/invoices", icon: FileText, roles: ["admin", "hod", "bookkeeper"] },
  { name: "Upload", href: "/upload", icon: Upload, roles: ["bookkeeper"] },
  { name: "Review Pending", href: "/review-pending", icon: Clock, roles: ["admin", "hod"] },
  { name: "Review History", href: "/review-history", icon: History, roles: ["admin", "hod", "bookkeeper"] },
  { name: "User Management", href: "/users", icon: Users, roles: ["admin"] },
  { name: "Payments", href: "/payments", icon: CreditCard, roles: ["hod"] },
  { name: "Matching Table", href: "/purchase-deliveries", icon: CreditCard, roles: ["admin"] },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin Dashboard';
      case 'hod':
        return 'HOD Dashboard';
      case 'bookkeeper':
        return 'Bookkeeper Dashboard';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-900 shadow-lg flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary">BharatInvo</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {getRoleDisplayName(user.role)}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.name}>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors",
                    isActive && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-white text-sm">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex space-x-1">
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="p-2">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2" 
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
