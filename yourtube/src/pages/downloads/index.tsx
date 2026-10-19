import React from "react";
import Head from "next/head";
import DownloadsContent from "@/components/DownloadsContent";

export default function DownloadsPage() {
  return (
    <>
      <Head>
        <title>Downloads & Offline Library - YourTube</title>
        <meta
          name="description"
          content="Manage your downloaded videos, active subscription plans, and daily download quotas on YourTube."
        />
      </Head>
      <main className="flex-1 p-3.5 sm:p-6 max-w-7xl mx-auto w-full">
        <DownloadsContent />
      </main>
    </>
  );
}
