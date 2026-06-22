import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import Image from "next/image";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  avatarUrl?: string | null;
  userName?: string | null;
}

export function AppShell({ children, title, avatarUrl, userName }: AppShellProps) {
  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="flex min-h-screen bg-pmfit-bg">
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col ml-[240px] min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-pmfit-bg/80 backdrop-blur-md border-b border-pmfit-border px-6 h-14 flex items-center justify-between shrink-0">
          {title && (
            <h2 className="text-[15px] font-semibold text-pmfit-text">{title}</h2>
          )}
          <div className="ml-auto flex items-center gap-3">
            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-pmfit-blue flex items-center justify-center text-white text-[12px] font-bold overflow-hidden shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={initials} width={32} height={32} className="object-cover" />
              ) : (
                initials
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
