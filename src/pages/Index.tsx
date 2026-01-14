import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  QrCode,
  Wallet,
  Code,
  Loader2,
} from "lucide-react";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold">Kobaru</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="outline">Masuk</Button>
            </Link>
            <Link to="/auth">
              <Button>Daftar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Payment Gateway
            <span className="block text-primary">Untuk Bisnis Anda</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Terima pembayaran QRIS dengan mudah, aman, dan cepat. Integrasi API yang sederhana untuk developer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto">
                Mulai Sekarang
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Lihat Dokumentasi
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Fitur Unggulan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-card border border-border rounded-lg">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">QRIS Payment</h3>
            <p className="text-muted-foreground">
              Dukung semua aplikasi e-wallet dan mobile banking dengan standar QRIS Indonesia.
            </p>
          </div>

          <div className="p-6 bg-card border border-border rounded-lg">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Keamanan Terjamin</h3>
            <p className="text-muted-foreground">
              Transaksi dilindungi dengan sistem keamanan berlapis dan API key authentication.
            </p>
          </div>

          <div className="p-6 bg-card border border-border rounded-lg">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Update</h3>
            <p className="text-muted-foreground">
              Status pembayaran terupdate secara real-time. Saldo otomatis bertambah saat terkonfirmasi.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <h2 className="text-3xl font-bold text-center mb-12">Cara Kerja</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              1
            </div>
            <h3 className="font-semibold mb-2">Daftar Akun</h3>
            <p className="text-sm text-muted-foreground">
              Buat akun gratis dan dapatkan API credentials
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              2
            </div>
            <h3 className="font-semibold mb-2">Buat Deposit</h3>
            <p className="text-sm text-muted-foreground">
              Request deposit dan dapatkan QR code QRIS
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              3
            </div>
            <h3 className="font-semibold mb-2">Scan & Bayar</h3>
            <p className="text-sm text-muted-foreground">
              Pelanggan scan QRIS dan bayar via e-wallet
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              4
            </div>
            <h3 className="font-semibold mb-2">Saldo Masuk</h3>
            <p className="text-sm text-muted-foreground">
              Saldo otomatis bertambah saat pembayaran sukses
            </p>
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">API yang Mudah Diintegrasikan</h2>
            <p className="text-muted-foreground mb-6">
              Dokumentasi lengkap dan contoh kode yang jelas untuk memudahkan integrasi ke sistem Anda.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <span>RESTful API dengan response JSON</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <span>Autentikasi menggunakan API ID & API Key</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <span>Endpoint untuk create, check, dan list deposit</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <span>Webhook notification untuk status update</span>
              </li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Code className="h-5 w-5 text-primary" />
              <span className="font-medium">Contoh Request</span>
            </div>
            <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm">
              <code className="text-muted-foreground">
{`// Create Deposit
POST /functions/v1/deposit
Headers:
  x-api-id: API_XXXXXXXXXXXXXXXX
  x-api-key: SK_XXXXXXXXXXXXXXXX

Body:
{
  "amount": 50000
}

// Response
{
  "status": "success",
  "data": {
    "ref_id": "USR_abc12345_1234567890",
    "amount": 50000,
    "final_amount": 50001,
    "qr_image": "https://...",
    "expires_at": "2024-01-14T13:00:00Z"
  }
}`}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Siap Untuk Memulai?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Daftar sekarang dan mulai terima pembayaran dalam hitungan menit.
          </p>
          <Link to="/auth">
            <Button variant="secondary" size="lg">
              <Wallet className="mr-2 h-4 w-4" />
              Buat Akun Gratis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Kobaru Payment Gateway. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
