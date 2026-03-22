import { useState, useEffect, useRef } from "react";
import { Button, Card } from "@/components/ui-components";
import { customFetch } from "@workspace/api-client-react";
import {
  Building2,
  Phone,
  MapPin,
  FileText,
  Image,
  Save,
  CheckCircle2,
  Upload,
  Loader2,
} from "lucide-react";

interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  commercialRegNo: string;
  logoUrl: string;
}

async function fetchSettings(): Promise<CompanySettings> {
  return customFetch<CompanySettings>("/api/settings", { method: "GET" });
}

async function saveSettings(data: CompanySettings): Promise<CompanySettings> {
  return customFetch<CompanySettings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

export default function Settings() {
  const [form, setForm] = useState<CompanySettings>({
    name: "",
    address: "",
    phone: "",
    commercialRegNo: "",
    logoUrl: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadLogo = async (file: File): Promise<string> => {
    const token = localStorage.getItem("poultry_erp_token") ?? "";
    const metaRes = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "image/png" }),
    });
    if (!metaRes.ok) throw new Error("فشل الحصول على رابط الرفع");
    const { uploadURL, objectPath } = await metaRes.json() as { uploadURL: string; objectPath: string };
    const uploadRes = await fetch(uploadURL, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "image/png" },
    });
    if (!uploadRes.ok) throw new Error("فشل رفع الملف إلى التخزين");
    return `/api/storage${objectPath}`;
  };

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        setForm(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError("تعذّر تحميل الإعدادات");
        setIsLoading(false);
      });
  }, []);

  const handleChange = (field: keyof CompanySettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const serveUrl = await uploadLogo(file);
      setForm((prev) => ({ ...prev, logoUrl: serveUrl }));
      setSaved(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "فشل رفع الشعار");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const updated = await saveSettings(form);
      setForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("حدث خطأ أثناء الحفظ، يرجى المحاولة مجدداً");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse">جاري التحميل...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold">إعدادات الشركة</h2>
        <p className="text-muted-foreground text-sm mt-1">
          تظهر هذه المعلومات في رأس الفواتير المطبوعة
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> هوية الشركة
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">اسم الشركة *</label>
            <div className="relative">
              <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="مثال: شركة الدواجن الذهبية"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">العنوان</label>
            <div className="relative">
              <MapPin className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
              <textarea
                rows={2}
                className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="مثال: شارع الملك فهد، الرياض"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">رقم السجل التجاري</label>
              <div className="relative">
                <FileText className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="مثال: 1234567890"
                  dir="ltr"
                  value={form.commercialRegNo}
                  onChange={(e) => handleChange("commercialRegNo", e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" /> شعار الشركة
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري رفع الشعار...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    رفع صورة الشعار
                  </>
                )}
              </button>
              <span className="text-xs text-muted-foreground">PNG أو SVG موصى به</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoFileChange}
            />

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">أو أدخل رابط الشعار مباشرةً</label>
              <input
                type="url"
                className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="https://example.com/logo.png"
                dir="ltr"
                value={form.logoUrl}
                onChange={(e) => handleChange("logoUrl", e.target.value)}
              />
            </div>

            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}

            {form.logoUrl && (
              <div className="mt-3 p-3 bg-secondary/30 rounded-xl border border-border flex items-center gap-3">
                <img
                  src={form.logoUrl}
                  alt="معاينة الشعار"
                  className="h-14 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-xs text-muted-foreground">معاينة الشعار</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-primary font-medium">
            ستظهر هذه المعلومات في رأس الفاتورة المطبوعة فوراً بعد الحفظ.
          </p>
        </Card>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <Button type="submit" isLoading={isSaving} className="flex-1 sm:flex-none sm:px-8">
            <Save className="w-4 h-4 ml-2" /> حفظ الإعدادات
          </Button>
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> تم الحفظ بنجاح
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
