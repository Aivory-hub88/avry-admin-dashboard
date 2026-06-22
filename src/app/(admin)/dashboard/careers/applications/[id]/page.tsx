"use client";
import { useParams } from "next/navigation";
import ApplicationDetail from "@/components/careers/ApplicationDetail";

export default function ApplicationDetailPage() {
  const params = useParams();
  const applicationId = params.id as string;

  return <ApplicationDetail applicationId={applicationId} />;
}
