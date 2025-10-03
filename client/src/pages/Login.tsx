import { useEffect } from "react";

export default function Login() {
  useEffect(() => {
    window.location.href = "/api/login";
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    </div>
  );
}
