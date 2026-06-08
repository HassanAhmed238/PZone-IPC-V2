import { motion } from "framer-motion";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          غير مصرح بالوصول
        </h1>
        <p className="text-muted-foreground mb-6">
          ليس لديك صلاحية للوصول إلى هذه الصفحة. تواصل مع المسؤول إذا كنت تعتقد أن هذا خطأ.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            رجوع
          </Button>
          <Button onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-2" />
            الرئيسية
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
