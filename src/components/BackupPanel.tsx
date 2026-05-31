import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Titulo, AppConfig } from '@/types/titulo';
import { importBackup } from '@/lib/storage';

interface Props {
  titulos: Titulo[];
  config: AppConfig;
  onImportTitulos: (titulos: Titulo[]) => Promise<void> | void;
  onImportConfig: (patch: Partial<AppConfig>) => Promise<void> | void;
}

export function BackupPanel({ titulos, config, onImportTitulos, onImportConfig }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const stamp = () => new Date().toISOString().slice(0, 10);

  const exportTudo = () => {
    const payload = {
      versao: 1,
      exportadoEm: new Date().toISOString(),
      titulos,
      config,
    };
    const blob = new Blob(['\uFEFF' + JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-financeiro-${stamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup completo gerado');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text.replace(/^\uFEFF/, ''));
      if (!data || typeof data !== 'object') throw new Error('Arquivo inválido');

      const backupTitulos: Titulo[] = Array.isArray(data.titulos) ? data.titulos : [];

      // Determina config base: data.config se existir, senão config prop atual
      let backupConfig: AppConfig = (data.config && typeof data.config === 'object')
        ? { ...data.config }
        : { ...config };

      // HIPOTESE: backup antigo pode ter clientes na raiz (data.clientes) em vez de data.config.clientes
      if ((!backupConfig.clientes || backupConfig.clientes.length === 0) && Array.isArray(data.clientes) && data.clientes.length > 0) {
        backupConfig.clientes = data.clientes;
      }

      // Usa transação atômica única para evitar "database is locked"
      await importBackup(backupTitulos, backupConfig);

      toast.success('Backup restaurado com sucesso! Recarregando...');
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
        <CardTitle className="text-sm">💾 Backup Completo</CardTitle>
        <p className="text-xs text-muted-foreground">
          Exporte ou importe todo o aplicativo em um único arquivo
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="w-full" onClick={exportTudo}>
          <Download className="h-4 w-4 mr-1" /> Exportar Backup (.json)
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1" /> Importar Backup (.json)
        </Button>
        <p className="text-[10px] text-muted-foreground pt-1">
          ⚠️ A importação <strong>substitui</strong> todos os dados existentes.
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
