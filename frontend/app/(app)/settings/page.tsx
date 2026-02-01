'use client';

import { AppShell } from '@/components/app/shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">Receipt prefix update is optional; add later.</CardContent>
      </Card>
    </AppShell>
  );
}

