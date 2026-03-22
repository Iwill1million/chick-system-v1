import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-3 bg-amber-500 text-white px-4 py-3 text-sm font-semibold shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>لا يوجد اتصال بالإنترنت — تحقق من شبكتك وحاول مجدداً</span>
    </div>
  );
}
