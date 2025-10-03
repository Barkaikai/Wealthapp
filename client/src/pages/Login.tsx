import { useEffect } from "react";
import wealthBackground from "@assets/ChatGPT Image Oct 3, 2025, 12_12_37 AM_1759464919082.png";

export default function Login() {
  useEffect(() => {
    window.location.href = "/api/login";
  }, []);

  return (
    <div className="relative flex items-center justify-center h-screen overflow-hidden">
      {/* Wealth Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${wealthBackground})` }}
      />
      
      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[rgb(10,12,20)]/90 via-[rgb(10,12,20)]/75 to-[rgb(10,12,20)]/85" />

      {/* Content */}
      <div className="relative z-10 text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-foreground">Redirecting to secure login...</p>
      </div>
    </div>
  );
}
