import { useParams, useSearchParams } from "react-router-dom";
import { IPCBoardView } from "@/components/ipc/IPCBoardView";
import { AlertCircle } from "lucide-react";

export default function IPCBoardPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const signedUrl = searchParams.get("s"); // signed URL passed in query param
  const page = searchParams.get("page");

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #020817, #0a1628)" }}>
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invalid Share Link</h1>
          <p className="text-slate-400">This board link is invalid or has been revoked.</p>
        </div>
      </div>
    );
  }

  return <IPCBoardView token={token} signedUrl={signedUrl} initialPage={page} />;
}
