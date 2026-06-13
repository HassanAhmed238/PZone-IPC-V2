import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import WhatsNewDialog from "./WhatsNewDialog";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const sidebarWidth = collapsed ? 72 : 260;

  return (
    <div className="min-h-screen bg-background">
      <WhatsNewDialog />
      <AppSidebar 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(!collapsed)} 
        mobileMenuOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        isMobile={isMobile}
      />
      <AppHeader 
        sidebarWidth={isMobile ? 0 : sidebarWidth} 
        onMenuClick={() => setMobileMenuOpen(true)}
        isMobile={isMobile}
      />
      
      {/* Overlay for mobile menu */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main
        className="pt-16 transition-all duration-300 min-h-screen"
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
