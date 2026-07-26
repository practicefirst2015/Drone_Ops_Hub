import { useState, useEffect } from "react";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

export function InvoiceDefaultsPanel() {
  const { settings, isLoading, updateSettings } = useOrgSettings();

  const [taxRate, setTaxRate] = useState("0");
  const [terms, setTerms] = useState("30");
  const [currency, setCurrency] = useState("USD");
  const [discountType, setDiscountType] = useState("flat");
  const [notesTemplate, setNotesTemplate] = useState("");

  useEffect(() => {
    if (!settings) return;
    setTaxRate(String(settings.default_tax_rate ?? 0));
    setTerms(String(settings.default_payment_terms_days ?? 30));
    setCurrency(settings.default_currency ?? "USD");
    setDiscountType(settings.default_discount_type ?? "flat");
    setNotesTemplate(settings.invoice_notes_template ?? "");
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      default_tax_rate: parseFloat(taxRate) || 0,
      default_payment_terms_days: parseInt(terms) || 30,
      default_currency: currency,
      default_discount_type: discountType,
      invoice_notes_template: notesTemplate,
    });
  };

  if (isLoading) return <div className="font-mono text-xs text-muted-foreground">Loading…</div>;

  return (
    <div className="surface border border-border p-6 max-w-lg space-y-5">
      <h2 className="font-mono text-sm font-semibold tracking-wide uppercase mb-4">Invoice Defaults</h2>

      <div className="space-y-2">
        <Label className="font-mono text-xs">Default Tax Rate (%)</Label>
        <Input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label className="font-mono text-xs">Payment Terms (days)</Label>
        <Input type="number" min="0" value={terms} onChange={(e) => setTerms(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label className="font-mono text-xs">Currency</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="font-mono text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["USD", "EUR", "GBP", "CAD", "AUD"].map((c) => (
              <SelectItem key={c} value={c} className="font-mono text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="font-mono text-xs">Default Discount Type</Label>
        <Select value={discountType} onValueChange={setDiscountType}>
          <SelectTrigger className="font-mono text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="flat" className="font-mono text-xs">Flat</SelectItem>
            <SelectItem value="percentage" className="font-mono text-xs">Percentage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="font-mono text-xs">Invoice Notes Template</Label>
        <Textarea
          value={notesTemplate}
          onChange={(e) => setNotesTemplate(e.target.value)}
          placeholder="Default notes that appear on new invoices…"
          rows={3}
          className="font-mono text-xs"
        />
      </div>

      <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
        <Save className="w-3.5 h-3.5" />
        {updateSettings.isPending ? "Saving…" : "Save Defaults"}
      </Button>
    </div>
  );
}
