import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, KeyRound, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/useAuthStore";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useRequestProfileNameChange, useUserProfile } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  chairman: "Chairman",
  ceo: "CEO",
  finance: "Finance",
  project_manager: "Project Manager",
  estimator: "Estimator",
  cost_control: "Cost Control",
  procurement: "Procurement",
  inventory: "Inventory",
  site_engineer: "Site Engineer",
  admin: "Admin",
  contract_admin: "Contract Admin",
  ipc_clerk: "IPC Clerk",
  scheduler: "Scheduler",
  board_member: "Board Member",
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const { data: profile, isLoading } = useUserProfile();
  const requestNameChange = useRequestProfileNameChange();
  const [requestedName, setRequestedName] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const displayName = profile?.full_name || user?.email || "User";
  const primaryRole = useMemo(() => {
    const role = roles[0];
    return role ? ROLE_LABELS[role] || role : profile?.department || "User";
  }, [roles, profile?.department]);

  const submitNameRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await requestNameChange.mutateAsync(requestedName);
      toast.success("Name change request sent for admin approval.");
      setRequestedName("");
    } catch (error: any) {
      toast.error(error?.message || "Could not submit name change request.");
    }
  };

  const submitPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.email) {
      toast.error("No email is attached to this account.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password confirmation does not match.");
      return;
    }
    if (oldPassword === newPassword) {
      toast.error("New password must be different from the old password.");
      return;
    }

    setChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });
      if (signInError) throw new Error("Old password is incorrect.");

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      toast.success("Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error?.message || "Could not update password.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile name and password under P.Zone approval policy.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="text-primary" />
            Profile
          </CardTitle>
          <CardDescription>Visible user identity used in the app header, approvals, and reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-4">
            <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-bold">
              {(displayName || "U").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-foreground">{isLoading ? "Loading..." : displayName}</div>
              <div className="text-sm text-muted-foreground">{primaryRole}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <Badge className="ml-auto" variant={profile?.account_status === "suspended" ? "destructive" : "secondary"}>
              {profile?.account_status || "approved"}
            </Badge>
          </div>

          {profile?.profile_change_status === "pending" && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <Clock className="mt-0.5 h-4 w-4" />
              <div>
                Pending admin approval for name: <span className="font-semibold">{profile.pending_full_name}</span>
              </div>
            </div>
          )}

          {profile?.profile_change_status === "approved" && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Last profile change was approved.
            </div>
          )}

          <form onSubmit={submitNameRequest} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="requestedName">Request display name change</Label>
              <Input
                id="requestedName"
                value={requestedName}
                onChange={(event) => setRequestedName(event.target.value)}
                placeholder={profile?.full_name || "Enter your full name"}
                minLength={2}
              />
            </div>
            <Button type="submit" disabled={requestNameChange.isPending || requestedName.trim().length < 2}>
              {requestNameChange.isPending ? "Sending..." : "Send for Approval"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <KeyRound className="text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>Enter your old password, then your new password twice.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPasswordChange} className="grid gap-4 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Old password</Label>
              <Input id="oldPassword" type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} required />
            </div>
            <Button type="submit" disabled={changingPassword} className="w-fit">
              <ShieldCheck className="h-4 w-4" />
              {changingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
