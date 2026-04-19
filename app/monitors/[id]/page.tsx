import { notFound } from "next/navigation";
import MonitorDetailClient from "./MonitorDetailClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function MonitorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const monitorId = Number(id);

  if (!Number.isFinite(monitorId) || monitorId <= 0) {
    notFound();
  }

  const detail = {
    monitor: {
      id: monitorId,
    },
  };

  return <MonitorDetailClient detail={detail} />;
}