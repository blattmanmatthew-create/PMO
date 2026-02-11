/**
 * Top navigation bar shown on all pages.
 * Shows the app name "PMO Assistant" which links back to the dashboard.
 */
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="bg-[#1F3864] text-white px-6 py-4 shadow">
      <Link href="/dashboard" className="text-lg font-semibold hover:opacity-90">
        PMO Assistant
      </Link>
    </nav>
  );
}
