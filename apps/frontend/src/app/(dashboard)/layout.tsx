"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarWithProfile from "@/components/SidebarWithProfile";
import { useToast } from "@/components/ToastContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");

    if (!token) {
      addToast("Please sign in to access this page", "error");
      router.push("/signin");
      return;
    }

    setIsLoading(false);
  }, [router, addToast]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#A3CB8B]">
        <div className="bg-[#778e6b] rounded-xl shadow-lg p-8 text-white border border-white/10">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return <SidebarWithProfile>{children}</SidebarWithProfile>;
}
