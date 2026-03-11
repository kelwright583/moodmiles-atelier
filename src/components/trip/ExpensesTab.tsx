import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Receipt, Plus, Camera, X, Loader2, Trash2,
  Utensils, Car, Building, Ticket, ShoppingBag, MoreHorizontal,
  ArrowRightLeft, ChevronDown, ChevronUp, DollarSign, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { TripExpense, TripCollaborator, Profile } from "@/types/database";

interface ExpensesTabProps {
  tripId: string;
  trip: { destination: string; user_id: string };
}

type Category = TripExpense["category"];

const CATEGORY_META: Record<Category, { icon: typeof Utensils; label: string; color: string }> = {
  food: { icon: Utensils, label: "Food & Drink", color: "text-orange-400" },
  transport: { icon: Car, label: "Transport", color: "text-blue-400" },
  accommodation: { icon: Building, label: "Accommodation", color: "text-violet-400" },
  activity: { icon: Ticket, label: "Activity", color: "text-emerald-400" },
  shopping: { icon: ShoppingBag, label: "Shopping", color: "text-pink-400" },
  other: { icon: MoreHorizontal, label: "Other", color: "text-muted-foreground" },
};

interface MemberProfile {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ExpensesTab = ({ tripId, trip }: ExpensesTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formCategory, setFormCategory] = useState<Category>("food");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formSplitWith, setFormSplitWith] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState("");
  const [formReceiptUrl, setFormReceiptUrl] = useState("");

  // ── Trip members ──────────────────────────────────────────────────────────
  const { data: collaborators = [] } = useQuery<TripCollaborator[]>({
    queryKey: ["trip-collaborators", tripId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_collaborators")
        .select("*")
        .eq("trip_id", tripId)
        .eq("status", "accepted");
      return (data || []) as TripCollaborator[];
    },
  });

  const memberIds = useMemo(() => {
    const ids = [trip.user_id, ...collaborators.map((c) => c.user_id).filter(Boolean) as string[]];
    return [...new Set(ids)];
  }, [trip.user_id, collaborators]);

  const { data: memberProfiles = [] } = useQuery<MemberProfile[]>({
    queryKey: ["member-profiles-expenses", memberIds.join(",")],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", memberIds);
      return (data || []) as MemberProfile[];
    },
    enabled: memberIds.length > 0,
  });

  const getProfile = (uid: string) => memberProfiles.find((p) => p.user_id === uid);
  const getName = (uid: string) => {
    if (uid === user?.id) return "You";
    return getProfile(uid)?.name?.split(" ")[0] || "Someone";
  };

  // ── Fetch expenses ────────────────────────────────────────────────────────
  const { data: expenses = [], isLoading } = useQuery<TripExpense[]>({
    queryKey: ["trip-expenses", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_expenses")
        .select("*")
        .eq("trip_id", tripId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TripExpense[];
    },
  });

  // ── Summary calculations ──────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalSpend = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    let myShare = 0;
    let iOwe = 0;
    let owedToMe = 0;

    for (const exp of expenses) {
      const splitMembers = exp.split_between.length > 0
        ? exp.split_between
        : memberIds;
      const perPerson = Number(exp.amount) / splitMembers.length;
      const amInSplit = splitMembers.includes(user?.id || "");

      if (exp.paid_by === user?.id) {
        myShare += perPerson;
        if (amInSplit) {
          owedToMe += Number(exp.amount) - perPerson;
        } else {
          owedToMe += Number(exp.amount);
        }
      } else if (amInSplit) {
        myShare += perPerson;
        iOwe += perPerson;
      }
    }

    return { totalSpend, myShare, iOwe, owedToMe };
  }, [expenses, memberIds, user?.id]);

  // ── Settle-up (simplified debts) ──────────────────────────────────────────
  const settlements = useMemo(() => {
    const balances: Record<string, number> = {};
    for (const uid of memberIds) balances[uid] = 0;

    for (const exp of expenses) {
      const splitMembers = exp.split_between.length > 0
        ? exp.split_between
        : memberIds;
      const perPerson = Number(exp.amount) / splitMembers.length;

      if (balances[exp.paid_by] !== undefined) {
        balances[exp.paid_by] += Number(exp.amount) - perPerson;
      }
      for (const uid of splitMembers) {
        if (uid !== exp.paid_by && balances[uid] !== undefined) {
          balances[uid] -= perPerson;
        }
      }
    }

    // Simplify debts: who owes whom
    const debtors = Object.entries(balances).filter(([, b]) => b < -0.01).map(([id, b]) => ({ id, amount: -b }));
    const creditors = Object.entries(balances).filter(([, b]) => b > 0.01).map(([id, b]) => ({ id, amount: b }));

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const result: { from: string; to: string; amount: number }[] = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const transfer = Math.min(debtors[di].amount, creditors[ci].amount);
      if (transfer > 0.01) {
        result.push({ from: debtors[di].id, to: creditors[ci].id, amount: Math.round(transfer * 100) / 100 });
      }
      debtors[di].amount -= transfer;
      creditors[ci].amount -= transfer;
      if (debtors[di].amount < 0.01) di++;
      if (creditors[ci].amount < 0.01) ci++;
    }

    return result;
  }, [expenses, memberIds]);

  // ── Grouped by date ───────────────────────────────────────────────────────
  const groupedByDate = useMemo(() => {
    const groups: Record<string, TripExpense[]> = {};
    for (const exp of expenses) {
      const date = exp.expense_date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(exp);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [expenses]);

  // ── Receipt scanning ──────────────────────────────────────────────────────
  const handleReceiptScan = useCallback(async (file: File) => {
    setScanning(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { image_base64: base64 },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Could not read receipt", description: data.error, variant: "destructive" });
        return;
      }

      // Upload receipt image to storage
      const path = `${tripId}/${user!.id}/${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
        setFormReceiptUrl(urlData.publicUrl);
      }

      // Pre-fill form
      if (data.merchant) setFormDesc(data.merchant);
      if (data.total) setFormAmount(String(data.total));
      if (data.currency) setFormCurrency(data.currency);
      if (data.category) setFormCategory(data.category as Category);
      if (data.date) setFormDate(data.date);
      if (data.items_summary) setFormNotes(data.items_summary);

      toast({ title: "Receipt scanned", description: `${data.merchant || "Receipt"} — ${data.currency || "$"}${data.total || ""}` });
      setAddOpen(true);
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }, [tripId, user]);

  // ── Save expense ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formDesc || !formAmount) {
      toast({ title: "Required", description: "Enter a description and amount." });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("trip_expenses").insert({
        trip_id: tripId,
        paid_by: user!.id,
        description: formDesc,
        amount: parseFloat(formAmount),
        currency: formCurrency,
        category: formCategory,
        split_between: formSplitWith.length > 0 ? formSplitWith : memberIds,
        receipt_url: formReceiptUrl || null,
        notes: formNotes || null,
        expense_date: formDate,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["trip-expenses", tripId] });
      toast({ title: "Expense added", description: `${formCurrency} ${parseFloat(formAmount).toFixed(2)}` });
      resetForm();
      setAddOpen(false);
    } catch (err: any) {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete expense ────────────────────────────────────────────────────────
  const handleDelete = async (exp: TripExpense) => {
    setDeletingId(exp.id);
    try {
      await supabase.from("trip_expenses").delete().eq("id", exp.id);
      queryClient.invalidateQueries({ queryKey: ["trip-expenses", tripId] });
      toast({ title: "Expense removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFormDesc("");
    setFormAmount("");
    setFormCurrency("USD");
    setFormCategory("food");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormSplitWith([]);
    setFormNotes("");
    setFormReceiptUrl("");
  };

  const toggleSplitMember = (uid: string) => {
    setFormSplitWith((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const formatDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* ── Summary Card ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-body mb-4">Trip Expenses</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-xl font-heading">{formCurrency} {summary.totalSpend.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-[0.12em]">Total Spend</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-xl font-heading">{formCurrency} {summary.myShare.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-[0.12em]">Your Share</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-xl font-heading text-emerald-400">{formCurrency} {summary.owedToMe.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-[0.12em]">Owed to You</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-xl font-heading text-red-400">{formCurrency} {summary.iOwe.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-[0.12em]">You Owe</p>
          </div>
        </div>
      </div>

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <Button
          variant="champagne"
          size="sm"
          className="flex-1"
          onClick={() => { resetForm(); setAddOpen(true); }}
        >
          <Plus size={14} /> Add Expense
        </Button>
        <Button
          variant="champagne-outline"
          size="sm"
          className="relative"
          onClick={() => receiptInputRef.current?.click()}
          disabled={scanning}
        >
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          Scan
        </Button>
        {settlements.length > 0 && (
          <Button
            variant="champagne-outline"
            size="sm"
            onClick={() => setSettleOpen(!settleOpen)}
          >
            <ArrowRightLeft size={14} /> Settle
          </Button>
        )}
      </div>

      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleReceiptScan(e.target.files[0]); e.target.value = ""; }}
      />

      {/* ── Settle Up Sheet ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {settleOpen && settlements.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-card rounded-2xl overflow-hidden"
          >
            <div className="p-5 space-y-3">
              <h3 className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-body">Settle Up</h3>
              {settlements.map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <span className="text-sm font-body">{getName(s.from)}</span>
                  <div className="flex-1 border-t border-dashed border-primary/30 relative">
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 text-[10px] text-primary font-body bg-card px-1">
                      {formCurrency} {s.amount.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-sm font-body">{getName(s.to)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Expense Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass-card rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base">New Expense</h3>
              <button onClick={() => setAddOpen(false)}>
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Description */}
            <input
              type="text"
              placeholder="What was it for?"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-body placeholder:text-muted-foreground/40 border-none outline-none"
            />

            {/* Amount + Currency */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full bg-secondary rounded-xl pl-8 pr-4 py-3 text-sm font-body placeholder:text-muted-foreground/40 border-none outline-none"
                />
              </div>
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
                className="bg-secondary rounded-xl px-3 py-3 text-sm font-body border-none outline-none w-[80px]"
              >
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="AUD">AUD</option>
                <option value="CAD">CAD</option>
                <option value="JPY">JPY</option>
                <option value="THB">THB</option>
              </select>
            </div>

            {/* Category */}
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][]).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setFormCategory(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body transition-all ${formCategory === key ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}
                  >
                    <Icon size={12} className={formCategory === key ? "text-primary" : meta.color} />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Date */}
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-body border-none outline-none"
            />

            {/* Split between */}
            {memberIds.length > 1 && (
              <div>
                <p className="text-xs text-muted-foreground font-body mb-2">Split between (leave empty for everyone)</p>
                <div className="flex flex-wrap gap-2">
                  {memberIds.map((uid) => {
                    const p = getProfile(uid);
                    const selected = formSplitWith.includes(uid);
                    return (
                      <button
                        key={uid}
                        onClick={() => toggleSplitMember(uid)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body transition-all ${selected ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}
                      >
                        {p?.avatar_url ? (
                          <img src={p.avatar_url} className="w-4 h-4 rounded-full" alt="" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] text-primary font-heading">
                            {(p?.name || "?")[0].toUpperCase()}
                          </span>
                        )}
                        {uid === user?.id ? "You" : p?.name?.split(" ")[0] || "Member"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <input
              type="text"
              placeholder="Notes (optional)"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-body placeholder:text-muted-foreground/40 border-none outline-none"
            />

            {/* Receipt thumbnail */}
            {formReceiptUrl && (
              <div className="flex items-center gap-2">
                <img src={formReceiptUrl} alt="Receipt" className="w-12 h-12 rounded-lg object-cover" />
                <span className="text-xs text-muted-foreground font-body">Receipt attached</span>
                <button onClick={() => setFormReceiptUrl("")} className="ml-auto">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
            )}

            <Button variant="champagne" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? "Saving..." : "Add Expense"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!isLoading && expenses.length === 0 && !addOpen && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Receipt size={28} className="text-primary" />
          </div>
          <h3 className="font-heading text-xl mb-2">No expenses yet</h3>
          <p className="text-sm text-muted-foreground font-body max-w-sm mx-auto">
            Track every spend and split bills effortlessly. Snap a receipt or add manually.
          </p>
        </div>
      )}

      {/* ── Expense list grouped by date ──────────────────────────────────── */}
      {!isLoading && groupedByDate.map(([date, dateExpenses]) => (
        <div key={date}>
          <h4 className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-body mb-2 px-1">
            {formatDate(date)}
          </h4>
          <div className="space-y-2">
            {dateExpenses.map((exp) => {
              const meta = CATEGORY_META[exp.category] || CATEGORY_META.other;
              const Icon = meta.icon;
              const payer = getProfile(exp.paid_by);
              const splitCount = exp.split_between.length > 0 ? exp.split_between.length : memberIds.length;
              const isExpanded = expandedId === exp.id;
              const canDelete = exp.paid_by === user?.id || trip.user_id === user?.id;

              return (
                <motion.div
                  key={exp.id}
                  layout
                  className="glass-card rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                    className="w-full flex items-center gap-3 p-4 text-left"
                  >
                    <div className={`w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0`}>
                      <Icon size={16} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body truncate">{exp.description}</p>
                      <p className="text-xs text-muted-foreground font-body">
                        {getName(exp.paid_by)} paid
                        {splitCount > 1 && ` · split ${splitCount} ways`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-heading">{exp.currency} {Number(exp.amount).toFixed(2)}</p>
                      {splitCount > 1 && (
                        <p className="text-[10px] text-muted-foreground font-body">
                          {exp.currency} {(Number(exp.amount) / splitCount).toFixed(2)} ea
                        </p>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground ml-1" /> : <ChevronDown size={14} className="text-muted-foreground ml-1" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 space-y-2"
                      >
                        {exp.notes && (
                          <p className="text-xs text-muted-foreground font-body">{exp.notes}</p>
                        )}
                        {exp.receipt_url && (
                          <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer">
                            <img src={exp.receipt_url} alt="Receipt" className="w-16 h-16 rounded-lg object-cover border border-border" />
                          </a>
                        )}
                        {splitCount > 1 && (
                          <div className="flex flex-wrap gap-1">
                            <Users size={10} className="text-muted-foreground mt-0.5" />
                            {(exp.split_between.length > 0 ? exp.split_between : memberIds).map((uid) => (
                              <span key={uid} className="text-[10px] font-body text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                {getName(uid)}
                              </span>
                            ))}
                          </div>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(exp)}
                            disabled={deletingId === exp.id}
                            className="flex items-center gap-1 text-xs text-red-400 font-body hover:text-red-300 transition-colors"
                          >
                            {deletingId === exp.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            Delete
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </motion.div>
  );
};

export default ExpensesTab;
