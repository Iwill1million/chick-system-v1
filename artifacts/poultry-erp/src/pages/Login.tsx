import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { Button, Input, Card } from "@/components/ui-components";
import { Package } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { mutate, isPending } = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token);
      },
      onError: () => {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("الرجاء إدخال جميع الحقول");
      return;
    }
    mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center lg:text-right">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
              <Package className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-display font-extrabold text-foreground mb-3">مرحباً بك مجدداً</h1>
            <p className="text-lg text-muted-foreground">قم بتسجيل الدخول للوصول إلى نظام الدواجن الخاص بك</p>
          </div>

          <Card className="p-8 shadow-2xl shadow-primary/5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <Input
                label="اسم المستخدم"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                dir="ltr"
                className="text-right"
              />
              <Input
                label="كلمة المرور"
                type="password"
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                dir="ltr"
                className="text-right"
              />
              
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20 text-center">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full mt-2" isLoading={isPending}>
                تسجيل الدخول
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>

      {/* Right side - Image Cover */}
      <div className="hidden lg:block lg:w-1/2 relative bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-teal-700 to-emerald-900 mix-blend-multiply" />
        <img 
          src={`${import.meta.env.BASE_URL}images/login-bg.png`} 
          alt="Login Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white text-right">
          <h2 className="text-3xl font-display font-bold mb-4">نظام متكامل لإدارة تجارتك</h2>
          <p className="text-lg text-white/80 leading-relaxed">
            تتبع المبيعات، إدارة المندوبين، مراقبة المخزون، وتحليل الأرباح بكل سهولة واحترافية.
          </p>
        </div>
      </div>
    </div>
  );
}
