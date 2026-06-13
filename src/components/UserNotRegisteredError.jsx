import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function UserNotRegisteredError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <Card className="max-w-md w-full rounded-2xl border border-border shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-warning/10">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-4">Access Restricted</h1>
          <p className="text-sm text-muted-foreground mb-8">
            You are not registered to use this application. Please contact the app administrator to request access.
          </p>
          <div className="p-4 bg-muted/50 rounded-xl text-sm text-muted-foreground text-left">
            <p>If you believe this is an error, you can:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
