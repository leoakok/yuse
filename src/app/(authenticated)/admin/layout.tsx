import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/require-admin";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAdminUser();
  if (!user) {
    notFound();
  }
  return children;
}
