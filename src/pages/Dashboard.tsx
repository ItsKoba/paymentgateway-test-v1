import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate, createDeposit, checkDeposit, type Deposit } from "@/lib/api";
import {
  CreditCard,
  Wallet,
  Key,
  History,
  LogOut,
  Copy,
  RefreshCw,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Dashboard() {
  const { user, profile, loading, signOut, refreshProfile, regenerateCredentials } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isCreatingDeposit, setIsCreatingDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [newDeposit, setNewDeposit] = useState<Deposit | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [checkingDeposit, setCheckingDeposit] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      fetchDeposits();
    }
  }, [profile]);

  const fetchDeposits = async () => {
    if (!profile) return;
    setLoadingDeposits(true);

    const { data, error } = await supabase
      .from("user_deposits")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setDeposits(data as Deposit[]);
    }
    setLoadingDeposits(false);
  };

  const handleCreateDeposit = async () => {
    if (!profile || !depositAmount) return;

    const amount = parseInt(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Masukkan nominal yang valid",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingDeposit(true);

    try {
      // Call edge function (which calls Kobaru API)
      const response = await createDeposit(profile.api_id, profile.api_key, amount);

      if (response.status === "error") {
        throw new Error(response.message || "Failed to create deposit");
      }

      if (response.data) {
        setNewDeposit(response.data as Deposit);
        setShowQrDialog(true);
        setDepositAmount("");
        fetchDeposits();

        toast({
          title: "Deposit berhasil dibuat",
          description: `Silakan bayar ${formatCurrency(response.data.final_amount)}`,
        });
      }
    } catch (error) {
      toast({
        title: "Gagal membuat deposit",
        description: (error as Error).message,
        variant: "destructive",
      });
    }

    setIsCreatingDeposit(false);
  };

  const handleCheckDeposit = async (deposit: Deposit) => {
    if (!profile) return;
    setCheckingDeposit(deposit.ref_id);

    try {
      // Call edge function (which checks with Kobaru API and updates database)
      const response = await checkDeposit(profile.api_id, profile.api_key, deposit.ref_id);

      if (response.status === "success" && response.data) {
        if (response.data.status === "paid" && deposit.status !== "paid") {
          await refreshProfile();
          fetchDeposits();

          toast({
            title: "Pembayaran diterima!",
            description: `Saldo Anda bertambah ${formatCurrency(deposit.final_amount)}`,
          });
        } else if (response.data.status === "expired") {
          fetchDeposits();
          toast({
            title: "Deposit expired",
            description: "Silakan buat deposit baru",
            variant: "destructive",
          });
        } else if (response.data.status === "unpaid") {
          toast({
            title: "Belum dibayar",
            description: "Deposit masih menunggu pembayaran",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengecek status deposit",
        variant: "destructive",
      });
    }

    setCheckingDeposit(null);
  };

  const handleRegenerateCredentials = async () => {
    setIsRegenerating(true);
    const result = await regenerateCredentials();

    if (result) {
      toast({
        title: "Credentials diperbarui",
        description: "API ID dan API Key baru telah digenerate",
      });
    } else {
      toast({
        title: "Gagal",
        description: "Tidak dapat regenerate credentials",
        variant: "destructive",
      });
    }
    setIsRegenerating(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Disalin!",
      description: `${label} telah disalin ke clipboard`,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Unpaid
          </Badge>
        );
    }
  };

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
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold">Kobaru</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.full_name || user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Saldo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(profile?.balance || 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Total Deposit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{deposits.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Deposit Berhasil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {deposits.filter((d) => d.status === "paid").length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="deposit" className="space-y-6">
          <TabsList>
            <TabsTrigger value="deposit" className="gap-2">
              <Plus className="h-4 w-4" />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Riwayat
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
          </TabsList>

          {/* Deposit Tab */}
          <TabsContent value="deposit">
            <Card>
              <CardHeader>
                <CardTitle>Buat Deposit Baru</CardTitle>
                <CardDescription>
                  Masukkan nominal yang ingin Anda depositkan via QRIS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Nominal (Rp)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="50000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min="1000"
                  />
                  <p className="text-sm text-muted-foreground">
                    Minimal deposit: Rp 1.000
                  </p>
                </div>
                <Button
                  onClick={handleCreateDeposit}
                  disabled={isCreatingDeposit || !depositAmount}
                  className="w-full sm:w-auto"
                >
                  {isCreatingDeposit ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Buat Deposit
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Riwayat Deposit</CardTitle>
                  <CardDescription>Daftar semua transaksi deposit Anda</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDeposits}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {loadingDeposits ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : deposits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada riwayat deposit</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ref ID</TableHead>
                          <TableHead>Nominal</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deposits.map((deposit) => (
                          <TableRow key={deposit.id}>
                            <TableCell className="font-mono text-sm">
                              {deposit.ref_id.substring(0, 20)}...
                            </TableCell>
                            <TableCell>{formatCurrency(deposit.final_amount)}</TableCell>
                            <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                            <TableCell>{formatDate(deposit.created_at)}</TableCell>
                            <TableCell>
                              {deposit.status === "unpaid" && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setNewDeposit(deposit);
                                      setShowQrDialog(true);
                                    }}
                                  >
                                    QR
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCheckDeposit(deposit)}
                                    disabled={checkingDeposit === deposit.ref_id}
                                  >
                                    {checkingDeposit === deposit.ref_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Cek"
                                    )}
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API Credentials</CardTitle>
                <CardDescription>
                  Gunakan credentials ini untuk mengakses API Payment Gateway
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>API ID</Label>
                  <div className="flex gap-2">
                    <Input value={profile?.api_id || ""} readOnly className="font-mono" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(profile?.api_id || "", "API ID")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={showApiKey ? profile?.api_key || "" : "••••••••••••••••••••••••"}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(profile?.api_key || "", "API Key")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={handleRegenerateCredentials}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Credentials
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    ⚠️ Regenerate akan membuat credentials lama tidak berlaku
                  </p>
                </div>

                {/* API Documentation */}
                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold mb-4">Dokumentasi API</h4>
                  <div className="space-y-4 text-sm">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium mb-2">Base URL</p>
                      <code className="text-xs bg-background px-2 py-1 rounded">
                        {import.meta.env.VITE_SUPABASE_URL}/functions/v1/deposit
                      </code>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium mb-2">Headers</p>
                      <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`x-api-id: ${profile?.api_id || "YOUR_API_ID"}
x-api-key: ${showApiKey ? profile?.api_key : "YOUR_API_KEY"}`}
                      </pre>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium mb-2">Create Deposit (POST)</p>
                      <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`{
  "amount": 50000
}`}
                      </pre>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium mb-2">Check Deposit (GET)</p>
                      <code className="text-xs bg-background px-2 py-1 rounded">
                        ?ref_id=YOUR_REF_ID
                      </code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* QR Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QRIS untuk Bayar</DialogTitle>
            <DialogDescription>
              Bayar {newDeposit && formatCurrency(newDeposit.final_amount)} menggunakan aplikasi e-wallet atau mobile banking
            </DialogDescription>
          </DialogHeader>
          {newDeposit && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={newDeposit.qr_image}
                  alt="QRIS"
                  className="w-64 h-64 border border-border rounded-lg"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold">{formatCurrency(newDeposit.final_amount)}</p>
                <p className="text-sm text-muted-foreground">
                  Ref: {newDeposit.ref_id}
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => handleCheckDeposit(newDeposit)}
                disabled={checkingDeposit === newDeposit.ref_id}
              >
                {checkingDeposit === newDeposit.ref_id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengecek...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Cek Status Pembayaran
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
