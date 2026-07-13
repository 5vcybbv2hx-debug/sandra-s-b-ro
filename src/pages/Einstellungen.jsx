import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Shield, Save, RotateCcw } from 'lucide-react';
import { saveSettings, getSettings } from '@/lib/settings';
import { toast } from 'sonner';

export default function Einstellungen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [config, setConfig] = useState(null);
  const [users, setUsers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [erfahrungswerte, setErfahrungswerte] = useState('{}');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadConfig(); if (isAdmin) loadUsers(); }, [isAdmin]);

  const loadConfig = async () => {
    try {
      const settings = await base44.entities.Kapazitaetseinstellung.list();
      let c = settings[0];
      if (!c) { c = await base44.entities.Kapazitaetseinstellung.create({ woechentliche_zielstunden: 25, stundensatz_standard: 65, steuerrueckstellung_prozent: 30, monatliches_umsatzziel: 6500, erfahrungswerte: {} }); }
      setConfig(c); setErfahrungswerte(JSON.stringify(c.erfahrungswerte || {}, null, 2));
      saveSettings({ woechentliche_zielstunden: c.woechentliche_zielstunden, stundensatz_standard: c.stundensatz_standard, steuerrueckstellung_prozent: c.steuerrueckstellung_prozent, monatliches_umsatzziel: c.monatliches_umsatzziel, erfahrungswerte: c.erfahrungswerte || {}, warning_threshold: getSettings().warning_threshold || 80 });
    } catch (e) { console.error(e); }
  };

  const loadUsers = async () => { try { setUsers(await base44.entities.User.list()); } catch (e) { console.error(e); } };

  const handleSave = async () => {
    setSaving(true);
    try {
      let erfObj = {}; try { erfObj = JSON.parse(erfahrungswerte); } catch { toast.error('Erfahrungswerte: ungültiges JSON'); setSaving(false); return; }
      const updated = await base44.entities.Kapazitaetseinstellung.update(config.id, { woechentliche_zielstunden: Number(config.woechentliche_zielstunden) || 25, stundensatz_standard: Number(config.stundensatz_standard) || 65, steuerrueckstellung_prozent: Number(config.steuerrueckstellung_prozent) || 30, monatliches_umsatzziel: Number(config.monatliches_umsatzziel) || 6500, erfahrungswerte: erfObj });
      setConfig(updated); saveSettings({ woechentliche_zielstunden: updated.woechentliche_zielstunden, stundensatz_standard: updated.stundensatz_standard, steuerrueckstellung_prozent: updated.steuerrueckstellung_prozent, monatliches_umsatzziel: updated.monatliches_umsatzziel, erfahrungswerte: erfObj, warning_threshold: getSettings().warning_threshold || 80 });
      toast.success('Einstellungen gespeichert');
    } catch (e) { toast.error('Fehler'); } finally { setSaving(false); }
  };

  const handleInvite = async () => { if (!inviteEmail.trim()) return; try { await base44.users.inviteUser(inviteEmail, inviteRole); toast.success(`Einladung an ${inviteEmail} gesendet`); setInviteEmail(''); loadUsers(); } catch (e) { toast.error('Einladung fehlgeschlagen'); } };

  if (!config) return <div className="p-8 text-center text-muted-foreground">Lade Einstellungen...</div>;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Einstellungen</h1>
      <Card className="p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><User className="w-5 h-5 text-brand" /><h3 className="font-semibold">Profil</h3></div><div className="space-y-3"><div><Label>Name</Label><Input value={user?.full_name || ''} disabled className="min-h-[48px] bg-cardbg" /></div><div><Label>E-Mail</Label><Input value={user?.email || ''} disabled className="min-h-[48px] bg-cardbg" /></div></div></Card>
      <Card className="p-5 shadow-sm"><h3 className="font-semibold mb-4">Kapazität & Finanzen</h3><div className="grid grid-cols-2 gap-3">
        <div><Label>Wochenstunden-Ziel</Label><Input type="number" value={config.woechentliche_zielstunden} onChange={(e) => setConfig({ ...config, woechentliche_zielstunden: e.target.value })} className="min-h-[48px]" /></div>
        <div><Label>Standard-Stundensatz (€)</Label><Input type="number" value={config.stundensatz_standard} onChange={(e) => setConfig({ ...config, stundensatz_standard: e.target.value })} className="min-h-[48px]" /></div>
        <div><Label>Steuerrückstellung (%)</Label><Input type="number" value={config.steuerrueckstellung_prozent} onChange={(e) => setConfig({ ...config, steuerrueckstellung_prozent: e.target.value })} className="min-h-[48px]" /></div>
        <div><Label>Monatsumsatzziel (€)</Label><Input type="number" value={config.monatliches_umsatzziel} onChange={(e) => setConfig({ ...config, monatliches_umsatzziel: e.target.value })} className="min-h-[48px]" /></div>
      </div></Card>
      {isAdmin && (<Card className="p-5 shadow-sm"><h3 className="font-semibold mb-2">Erfahrungswerte (JSON)</h3><p className="text-sm text-muted-foreground mb-2">Format: {`{"Grundriss_Entwurf": 6.5, "Genehmigungsplanung_Baugesuch": 12}`}</p><Textarea value={erfahrungswerte} onChange={(e) => setErfahrungswerte(e.target.value)} rows={6} className="font-mono text-sm" /></Card>)}
      <Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] w-full"><Save className="w-4 h-4 mr-1" /> {saving ? 'Speichert...' : 'Speichern'}</Button>
      {isAdmin && (<Card className="p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><Shield className="w-5 h-5 text-accent" /><h3 className="font-semibold">Admin — Nutzerverwaltung</h3></div><div className="space-y-4"><div className="flex gap-2"><Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="E-Mail" className="min-h-[48px] flex-1" /><Select value={inviteRole} onValueChange={setInviteRole}><SelectTrigger className="w-32 min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Nutzer</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select><Button onClick={handleInvite} className="bg-accent hover:bg-accent-dark text-white min-h-[48px]">Einladen</Button></div><div className="space-y-2">{users.map((u) => (<div key={u.id} className="flex items-center justify-between p-3 bg-cardbg rounded-xl min-h-[48px]"><div><p className="font-medium">{u.full_name || u.email}</p><p className="text-sm text-muted-foreground">{u.email}</p></div><span className={`text-xs font-medium px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-accent-light text-accent' : 'bg-brand-light text-brand-dark'}`}>{u.role || 'user'}</span></div>))}</div></div></Card>)}
    </div>
  );
}