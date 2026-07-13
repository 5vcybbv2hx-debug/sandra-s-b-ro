import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, RotateCcw, Shield } from 'lucide-react';
import { getSettings, saveSettings } from '@/lib/settings';
import { toast } from 'sonner';

export default function Einstellungen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [stundensatz, setStundensatz] = useState(getSettings().default_stundensatz || '');
  const [steuerProzent, setSteuerProzent] = useState(getSettings().steuerruecklage_prozent || 30);
  const [users, setUsers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const data = await base44.entities.User.list();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const saveProfileSettings = () => {
    saveSettings({
      default_stundensatz: Number(stundensatz) || 0,
      steuerruecklage_prozent: Number(steuerProzent) || 30,
    });
    toast.success('Einstellungen gespeichert');
  };

  const resetMorgenroutine = () => {
    localStorage.removeItem('sandra_morgenroutine');
    toast.success('Morgenroutine zurückgesetzt — erscheint beim nächsten Öffnen');
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      toast.success(`Einladung an ${inviteEmail} gesendet`);
      setInviteEmail('');
      loadUsers();
    } catch (e) {
      toast.error('Einladung fehlgeschlagen');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Einstellungen</h1>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-brand" />
          <h3 className="font-semibold">Profil</h3>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={user?.full_name || ''} disabled className="min-h-[48px] bg-cardbg" />
          </div>
          <div>
            <Label>E-Mail</Label>
            <Input value={user?.email || ''} disabled className="min-h-[48px] bg-cardbg" />
          </div>
          <div>
            <Label>Rolle</Label>
            <Input value={isAdmin ? 'Admin' : 'Nutzerin'} disabled className="min-h-[48px] bg-cardbg" />
          </div>
        </div>
      </Card>

      {!isAdmin && (
        <Card className="p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Standardwerte</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Standard-Stundensatz (€/h)</Label>
              <Input
                type="number"
                value={stundensatz}
                onChange={(e) => setStundensatz(e.target.value)}
                className="min-h-[48px]"
              />
            </div>
            <div>
              <Label>Steuerrücklage (%)</Label>
              <Input
                type="number"
                value={steuerProzent}
                onChange={(e) => setSteuerProzent(e.target.value)}
                className="min-h-[48px]"
              />
            </div>
          </div>
          <Button
            onClick={saveProfileSettings}
            className="bg-brand hover:bg-brand-dark text-white min-h-[48px] w-full mt-4"
          >
            Speichern
          </Button>
        </Card>
      )}

      {!isAdmin && (
        <Card className="p-5 shadow-sm">
          <h3 className="font-semibold mb-2">Morgenroutine</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Setze die Morgenroutine zurück. Sie erscheint beim nächsten Öffnen der App erneut.
          </p>
          <Button onClick={resetMorgenroutine} variant="outline" className="min-h-[48px]">
            <RotateCcw className="w-4 h-4 mr-2" /> Morgenroutine zurücksetzen
          </Button>
        </Card>
      )}

      {isAdmin && (
        <Card className="p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-accent" />
            <h3 className="font-semibold">Admin-Bereich — Nutzerverwaltung</h3>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="E-Mail-Adresse"
                className="min-h-[48px] flex-1"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-32 min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Nutzer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} className="bg-accent hover:bg-accent-dark text-white min-h-[48px]">
                Einladen
              </Button>
            </div>
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-cardbg rounded-xl min-h-[48px]"
                >
                  <div>
                    <p className="font-medium">{u.full_name || u.email}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      u.role === 'admin' ? 'bg-accent-light text-accent' : 'bg-brand-light text-brand-dark'
                    }`}
                  >
                    {u.role || 'user'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}