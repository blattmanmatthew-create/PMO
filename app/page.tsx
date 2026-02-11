/**
 * Home page — redirects to the dashboard.
 * The dashboard is the main entry point for the app.
 */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
