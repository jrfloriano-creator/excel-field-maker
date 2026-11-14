import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Titulo, AppConfig } from '@/types/titulo';
import { importBackup, saveContasPagar, getConfig, saveConfig } from '@/lib/storage';
import { realizarBackup } from '@/lib/backup';

interface Props {
  titulos: Titulo[];
  config: AppConfig;
  onImportTitulos: (titulos: Titulo[]) => Promise<void> | void;
  onImportConfig: (patch: Partial<AppConfig>) => Promise<void> | void;
}

export function BackupPanel({ titulos, config, onImportTitulos, onImportConfig }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const exportarBackup = async (modulo: 'financeiro' | 'contas-pagar') => {
    try {
      const info = await realizarBackup('manual', modulo);
      toast.success(`Backup ${modulo === 'financeiro' ? 'Financeiro' : 'Contas a Pagar'} gerado com sucesso!`);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao gerar backup');
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text.replace(/^\uFEFF/, ''));
      if (!data || typeof data !== 'object') throw new Error('Arquivo inválido');

      // ✅ Módulo isolado: Backup de Contas a Pagar
      if (data.modulo === 'contas-pagar') {
        const contas = Array.isArray(data.contasPagar) ? data.contasPagar : [];
        await saveContasPagar(contas);
        // Restaura as configurações do módulo Contas a Pagar (multa, juros, categorias, motivos) sem tocar títulos
        const cfgContas = data.config?.contasPagar;
        if (cfgContas) {
          const current = await getConfig();
          await saveConfig({ ...current, contasPagar: cfgContas });
        }
        toast.success('Backup de Contas a Pagar restaurado com sucesso! Recarregando...');
        setTimeout(() => window.location.reload(), 1000);
        return;
      }

      // Backup Financeiro / Completo: restaura títulos + config (+ contas se completo/legado)
      const backupTitulos: Titulo[] = Array.isArray(data.titulos) ? data.titulos : [];
      const backupConfig: AppConfig = (data.config && typeof data.config === 'object')
        ? { ...data.config }
        : { ...config };

      // HIPOTESE: backup antigo pode ter clientes na raiz (data.clientes) em vez de data.config.clientes
      if ((!backupConfig.clientes || backupConfig.clientes.length === 0) && Array.isArray(data.clientes) && data.clientes.length > 0) {
        backupConfig.clientes = data.clientes;
      }

      await importBackup(backupTitulos, backupConfig);
      if (!data.modulo) {
        await saveContasPagar(Array.isArray(data.contasPagar) ? data.contasPagar : []);
      }

      toast.success('Backup financeiro restaurado com sucesso! Recarregando...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao importar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">💾 Backup</CardTitle>
        <p className="text-xs text-muted-foreground">
          Exporte por módulo (Financeiro ou Contas a Pagar) ou importe um backup completo
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="w-full" onClick={() => exportarBackup('financeiro')}>
          <Download className="h-4 w-4 mr-1" /> Backup Financeiro (.json)
        </Button>
        <Button className="w-full" variant="outline" onClick={() => exportarBackup('contas-pagar')}>
          <Download className="h-4 w-4 mr-1" /> Backup Contas a Pagar (.json)
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1" /> Importar Backup (.json)
        </Button>
        <p className="text-[10px] text-muted-foreground pt-1">
          ⚠️ A importação <strong>substitui</strong> os dados existentes. Use o módulo correto para cada restauração.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFile}
        />
      </CardContent>
    </Card>
  );
}
