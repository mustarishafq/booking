import { db } from '@/api/base44Client';

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, CheckCircle2, Wallet, Loader2 } from 'lucide-react';

const CREDIT_PACKAGES = [
  { amount: 2000, label: 'RM20.00', bonus: '' },
  { amount: 5000, label: 'RM50.00', bonus: 'Popular' },
  { amount: 10000, label: 'RM100.00', bonus: '+RM5 bonus' },
  { amount: 25000, label: 'RM250.00', bonus: '+RM15 bonus' },
];

export default function Credits() {
  const { user, setUser } = useOutletContext();
  const queryClient = useQueryClient();
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState('');

  const balance = user?.credit_balance_cents || 0;

  const handleAddCredits = async (amountCents) => {
    setAdding(true);
    setSuccess('');

    // In production this would go through Stripe — here we simulate the top-up
    const bonusCents = amountCents >= 25000 ? 1500 : amountCents >= 10000 ? 500 : 0;
    const totalAdd = amountCents + bonusCents;
    const newBalance = balance + totalAdd;

    await db.auth.updateMe({ credit_balance_cents: newBalance });
    await db.entities.Transaction.create({
      user_email: user.email,
      type: 'credit_purchase',
      amount_cents: totalAdd,
      balance_after_cents: newBalance,
      description: `Credit top-up: RM${(amountCents / 100).toFixed(2)}${bonusCents ? ` + RM${(bonusCents / 100).toFixed(2)} bonus` : ''}`,
    });

    setUser({ ...user, credit_balance_cents: newBalance });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    setAdding(false);
    setSuccess(`Successfully added RM${(totalAdd / 100).toFixed(2)} to your account!`);
    setSelectedPkg(null);
    setCustomAmount('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credits</h1>
        <p className="text-muted-foreground mt-1">Manage your booking credits</p>
      </div>

      {success && (
        <Alert className="border-emerald-500/20 bg-emerald-500/5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700">{success}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Current Balance</p>
              <p className="text-4xl font-bold tracking-tight">RM{(balance / 100).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Credits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CREDIT_PACKAGES.map((pkg, i) => (
              <button
                key={i}
                onClick={() => { setSelectedPkg(pkg.amount); setCustomAmount(''); }}
                className={`
                  relative p-4 rounded-xl border-2 text-center transition-all
                  ${selectedPkg === pkg.amount ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}
                `}
              >
                {pkg.bonus && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                    {pkg.bonus}
                  </span>
                )}
                <p className="text-lg font-bold">{pkg.label}</p>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or custom amount</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">RM</span>
              <Input
                className="pl-10"
                type="number"
                step="0.01"
                min="1"
                placeholder="Enter amount"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedPkg(null); }}
              />
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={adding || (!selectedPkg && !customAmount)}
            onClick={() => {
              const cents = selectedPkg || Math.round(parseFloat(customAmount) * 100);
              if (cents > 0) handleAddCredits(cents);
            }}
          >
            {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <CreditCard className="w-4 h-4 mr-2" />
            Add Credits
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            In production, this would process through Stripe. Credits are added instantly for demo purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}