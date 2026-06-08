/**
 * Client-side alarm engine.
 * Runs on dashboard page load to check for triggered alarms
 * and display toast notifications for urgent items.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AlarmCheck {
  contractId: string;
  contractTitle: string;
  alarmType: string;
  message: string;
  severity: "warning" | "critical" | "info";
}

/**
 * Check all active alarms and fire notifications for triggered ones.
 * Call this once on dashboard mount.
 */
export async function checkAlarms(): Promise<AlarmCheck[]> {
  const triggered: AlarmCheck[] = [];

  try {
    // 1. Fetch active alarms with contract info
    const { data: alarms, error: alarmErr } = await supabase
      .from("contract_alarms")
      .select("*, contracts:contract_id(id, title, end_date, status)")
      .eq("is_active", true);

    if (alarmErr || !alarms) return triggered;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const alarm of alarms as any[]) {
      const contract = alarm.contracts;
      if (!contract) continue;

      const triggerDays = alarm.trigger_days_before || 7;

      // ── Check by alarm type ──

      if (alarm.alarm_type === "expiry_warning" && contract.end_date) {
        const endDate = new Date(contract.end_date);
        endDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
        if (daysUntil <= triggerDays && daysUntil >= 0) {
          triggered.push({
            contractId: contract.id,
            contractTitle: contract.title,
            alarmType: "expiry_warning",
            message: `⏰ العقد "${contract.title}" ينتهي خلال ${daysUntil} يوم`,
            severity: daysUntil <= 3 ? "critical" : "warning",
          });
        }
      }

      if (alarm.alarm_type === "ipc_overdue") {
        // Check if there are submitted IPCs older than triggerDays
        const { data: pendingIPCs } = await supabase
          .from("contract_ipcs")
          .select("id, ipc_number, submission_date")
          .eq("contract_id", contract.id)
          .in("status", ["submitted", "under_review"]);

        if (pendingIPCs) {
          for (const ipc of pendingIPCs) {
            if (ipc.submission_date) {
              const submDate = new Date(ipc.submission_date);
              const daysPending = Math.ceil((today.getTime() - submDate.getTime()) / 86400000);
              if (daysPending >= triggerDays) {
                triggered.push({
                  contractId: contract.id,
                  contractTitle: contract.title,
                  alarmType: "ipc_overdue",
                  message: `⚠️ المستخلص #${ipc.ipc_number} للعقد "${contract.title}" معلق منذ ${daysPending} يوم`,
                  severity: daysPending >= triggerDays * 2 ? "critical" : "warning",
                });
              }
            }
          }
        }
      }

      if (alarm.alarm_type === "schedule_delay") {
        // Check for delayed activities in current baseline
        const { data: baseline } = await supabase
          .from("schedule_baselines")
          .select("id")
          .eq("contract_id", contract.id)
          .eq("is_current", true)
          .maybeSingle();

        if (baseline) {
          const { data: delayedActivities } = await supabase
            .from("schedule_activities")
            .select("id, activity_name, planned_finish, status")
            .eq("baseline_id", baseline.id)
            .in("status", ["delayed", "critical"]);

          if (delayedActivities && delayedActivities.length > 0) {
            triggered.push({
              contractId: contract.id,
              contractTitle: contract.title,
              alarmType: "schedule_delay",
              message: `📊 العقد "${contract.title}" به ${delayedActivities.length} نشاط متأخر`,
              severity: "warning",
            });
          }
        }
      }

      if (alarm.alarm_type === "milestone_approaching") {
        // Check for activities finishing within triggerDays
        const { data: baseline } = await supabase
          .from("schedule_baselines")
          .select("id")
          .eq("contract_id", contract.id)
          .eq("is_current", true)
          .maybeSingle();

        if (baseline) {
          const futureDate = new Date(today);
          futureDate.setDate(futureDate.getDate() + triggerDays);

          const { data: upcomingActivities } = await supabase
            .from("schedule_activities")
            .select("id, activity_name, planned_finish")
            .eq("baseline_id", baseline.id)
            .neq("status", "completed")
            .gte("planned_finish", today.toISOString().split("T")[0])
            .lte("planned_finish", futureDate.toISOString().split("T")[0]);

          if (upcomingActivities && upcomingActivities.length > 0) {
            for (const act of upcomingActivities) {
              const daysUntil = Math.ceil(
                (new Date(act.planned_finish!).getTime() - today.getTime()) / 86400000
              );
              triggered.push({
                contractId: contract.id,
                contractTitle: contract.title,
                alarmType: "milestone_approaching",
                message: `🎯 النشاط "${act.activity_name}" يستحق خلال ${daysUntil} يوم (${contract.title})`,
                severity: daysUntil <= 3 ? "critical" : "info",
              });
            }
          }
        }
      }

      // Custom alarm — just show the message template
      if (alarm.alarm_type === "custom" && alarm.message_template) {
        triggered.push({
          contractId: contract.id,
          contractTitle: contract.title,
          alarmType: "custom",
          message: alarm.message_template.replace("{{contract}}", contract.title),
          severity: "info",
        });
      }
    }

    // Update last_triggered_at for alarms that fired
    if (triggered.length > 0) {
      const alarmIds = alarms
        .filter((a: any) => triggered.some((t) => t.contractId === a.contracts?.id))
        .map((a: any) => a.id);

      if (alarmIds.length > 0) {
        await supabase
          .from("contract_alarms")
          .update({ last_triggered_at: new Date().toISOString() })
          .in("id", alarmIds);
      }
    }
  } catch (err) {
    console.error("[AlarmEngine] Error checking alarms:", err);
  }

  return triggered;
}

/**
 * Show toast notifications for triggered alarms.
 * Deduplicates by contractId + alarmType to avoid spam.
 */
export function showAlarmToasts(triggered: AlarmCheck[]) {
  // Deduplicate
  const seen = new Set<string>();
  const unique = triggered.filter((t) => {
    const key = `${t.contractId}:${t.alarmType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Show max 5 toasts to avoid overwhelming
  unique.slice(0, 5).forEach((alarm, idx) => {
    setTimeout(() => {
      if (alarm.severity === "critical") {
        toast.error(alarm.message, { duration: 8000 });
      } else if (alarm.severity === "warning") {
        toast.warning(alarm.message, { duration: 6000 });
      } else {
        toast.info(alarm.message, { duration: 5000 });
      }
    }, idx * 800); // Stagger by 800ms
  });

  if (unique.length > 5) {
    setTimeout(() => {
      toast.info(`... وتنبيهات أخرى (${unique.length - 5})`, { duration: 4000 });
    }, 5 * 800);
  }
}
