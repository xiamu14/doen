"use client";

import { useEffect, useRef, useState } from "react";
import { Popover, PopoverButton, PopoverPanel, Switch } from "@headlessui/react";
import * as Avatar from "@radix-ui/react-avatar";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, LoaderCircle } from "lucide-react";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/form-controls";
import { calendarFeedback, changeCalendar, getCalendarStatus } from "@/client/api/google-calendar";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YXZhdGFyfGVufDB8fDB8fHww";

export default function UserMenu() {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const initializedConnection = useRef(false);
  const commandRunning = useRef(false);
  const status = useQuery({
    queryKey: ["google-calendar", user?.id], queryFn: getCalendarStatus, enabled: Boolean(user), retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (busy) return false;
      const value = query.state.data;
      return value?.running || (value?.enabled && value.pending > 0 && !value.error) ? 1500 : false;
    },
  });
  const calendar = status.data;
  const feedback = calendarFeedback(error || calendar?.error || status.error?.message);
  const canSync = calendar?.connected && calendar.enabled && calendar.configured && !status.isError && !feedback.blocked;
  const syncing = busy || Boolean(calendar?.running || (calendar?.enabled && calendar.pending > 0 && !calendar.error));
  const syncStatus = !calendar?.connected ? "Not connected" : !calendar.enabled ? "Sync paused"
    : calendar.lastSyncedAt ? `Last synced ${new Date(calendar.lastSyncedAt).toLocaleString()}` : null;
  const run = async (action: Parameters<typeof changeCalendar>[0]) => {
    if (commandRunning.current) return;
    commandRunning.current = true;
    setBusy(true);
    setError("");
    try { await changeCalendar(action); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Calendar sync failed."); }
    finally {
      await status.refetch();
      commandRunning.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!user || !calendar?.configured || calendar.connected || initializedConnection.current) return;
    initializedConnection.current = true;
    void run({ action: "connect" });
  }, [user?.id, calendar?.configured, calendar?.connected]);

  const login = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await signIn.social({ provider: "google", callbackURL: "/" });
      if (result.error) throw new Error(result.error.message || "Could not authorize Google.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not authorize Google.");
      setBusy(false);
    }
  };
  const avatar = (
    <Avatar.Root className="block w-[30px] h-[30px] shrink-0 rounded-full overflow-hidden border-[2px] border-primary">
      <Avatar.Image src={user?.image || DEFAULT_AVATAR} alt={user?.name || "User avatar"} className="block w-full h-full rounded-full object-cover" />
      <Avatar.Fallback className="flex size-full items-center justify-center bg-[#f6f6f6] text-[12px] text-content">
        {user?.name?.slice(0, 1) || "U"}
      </Avatar.Fallback>
    </Avatar.Root>
  );
  const name = user ? Array.from(user.name).slice(0, 5).join("") : "Unauthorized";
  if (!user) return (
    <div className="relative flex flex-col items-end">
      <Button onClick={login} disabled={isPending || busy} aria-label="Authorize Google" className="flex items-center justify-end outline-none focus-visible:underline disabled:opacity-60">
        <span className="mr-[10px] text-[18px] font-medium text-content-secondary">{name}</span>{avatar}
      </Button>
      {error && <p role="alert" className="absolute right-0 top-full mt-2 w-[280px] rounded-[8px] bg-white p-2 text-[12px] text-red-600 shadow-modal">Could not sign in. Try again.</p>}
    </div>
  );

  return (
    <Popover className="relative">
      <PopoverButton aria-label="User details and calendar settings" className="flex items-center justify-end outline-none focus-visible:underline">
        <span className="mr-[10px] text-[18px] font-medium text-content-secondary">{name}</span>{avatar}
      </PopoverButton>
      <PopoverPanel anchor="bottom end" transition className="z-30 mt-[10px] w-[300px] max-w-[calc(100vw-32px)] rounded-[12px] border border-[#f1f1f1] bg-white p-4 text-content shadow-modal outline-none duration-300 ease-out data-closed:scale-95 data-closed:opacity-0">
        <div className="flex items-center gap-3">
          {avatar}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">{user.name}</p>
            <p className="truncate text-[12px] text-content-secondary">{user.email}</p>
          </div>
        </div>
        <div className="my-4 h-px bg-[#eee]" />
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[14px] font-medium"><CalendarDays size={16} />Google Calendar</span>
          <Switch checked={calendar?.enabled ?? false} disabled={busy || !calendar?.connected} onChange={(enabled) => void run({ action: "toggle", enabled })}
            aria-label="Google Calendar sync" className="group inline-flex h-[20px] w-[36px] shrink-0 items-center rounded-full bg-[#ddd] p-[3px] outline-none transition data-checked:bg-primary disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <span className="size-[14px] rounded-full bg-white transition group-data-checked:translate-x-4" />
          </Switch>
        </div>
        {!feedback.message && syncStatus && <p aria-live="polite" className="mt-3 text-[12px] text-content-secondary">
          {syncStatus}
        </p>}
        {feedback.message && <p role="alert" className="mt-2 text-[12px] text-red-600">{feedback.message}</p>}
        {(canSync || (calendar?.configured && !calendar.connected)) && <div className="mt-3 flex gap-2">
          {canSync && <Button onClick={() => void run({ action: "sync" })} disabled={syncing} aria-busy={syncing}
            className="flex h-[38px] flex-1 items-center justify-center rounded-full bg-primary px-3 text-[14px]  text-white disabled:opacity-60 mt-2">
            {syncing && <LoaderCircle size={16} aria-hidden="true" className="mr-2 animate-spin" />}
           <span className="font-bold">{syncing ? "Syncing…" : "Sync"}</span>
          </Button>}
        </div>}

      </PopoverPanel>
    </Popover>
  );
}
