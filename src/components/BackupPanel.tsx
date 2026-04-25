import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Titulo, AppConfig } from '@/types/titulo';
import {
  titulosToCSV, clientesToCSV, proprietariosToCSV, funcionariosToCSV,
  pixToCSV, configGeralToCSV, downloadFile,
  csvToTitulos, csvToClientes, csvToProprietarios, csvToFuncionarios,
  csvToPix, csvToConfigPatch
} from '@/lib/backup';

interface Props {
  titulos: Titulo[];
  config: AppConfig;
  onImportTitulos: (titulos: Titulo[]) => void;
  onImportConfig: (patch: Partial<AppConfig>) => void;
}

type ImportKind = 'titulos' | 'clientes' | 'proprietarios' | 'funcionarios' | 'pix' | 'config';

export function BackupPanel({ titulos, config, onImportTitulos, onImportConfig }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<ImportKind>('titulos');

  const stamp = () => new Date().toISOString().slice(0, 10);

  const exportTudo = () => {
    downloadFile(`titulos-${stamp()}.csv`, titulosToCSV(titulos));
    downloadFile(`clientes-${stamp()}.csv`, clientesToCSV(config.clientes));
    downloadFile(`proprietarios-${stamp()}.csv`, proprietariosToCSV(config.proprietarios));
    downloadFile(`funcionarios-${stamp()}.csv`, funcionariosToCSV(config.funcionarios));
    downloadFile(`pix-${stamp()}.csv`, pixToCSV(config.chavesPix));
    downloadFile(`config-${stamp()}.csv`, configGeralToCSV(config));
    toast.success('Backup completo gerado (6 arquivos CSV)');
  };

  const triggerImport = (kind: ImportKind) => {
    kindRef.current = kind;
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const kind = kindRef.current;
      if (kind === 'titulos') {
        const novos = csvToTitulos(text);
        onImportTitulos(novos);
        toast.success(`${novos.length} título(s) importado(s)`);
      } else if (kind === 'clientes') {
        onImportConfig({ clientes: csvToClientes(text) });
        toast.success('Clientes importados');
      } else if (kind === 'proprietarios') {
        onImportConfig({ proprietarios: csvToProprietarios(text) });
        toast.success('Proprietários importados');
      } else if (kind === 'funcionarios') {
        onImportConfig({ funcionarios: csvToFuncionarios(text) });
        toast.success('Funcionários importados');
      } else if (kind === 'pix') {
        onImportConfig({ chavesPix: csvToPix(text) });
        toast.success('Chaves PIX importadas');
      } else if (kind === 'config') {
        onImportConfig(csvToConfigPatch(text));
        toast.success('Configurações importadas');
      }
    } catch (err) {
      console.error(err);
      toast.error('Falha ao importar arquivo');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const item = (label: string, kind: ImportKind, count: number, csv: () => string, filename: string) => (
    <div className="flex items-center justify-between gap-2 border border-border rounded-md p-2">
      <div className="text-xs">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{count} registro{count !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => downloadFile(filename, csv())}>
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => triggerImport(kind)}>
          <Upload className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">💾 Backup (CSV)</CardTitle>
        <p className="text-xs text-muted-foreground">Exporte/importe seus dados em CSV</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="w-full" size="sm" onClick={exportTudo}>
          <Download className="h-4 w-4 mr-1" /> Exportar Tudo (Backup Completo)
        </Button>

        <div className="space-y-1.5 pt-1">
          {item('Títulos', 'titulos', titulos.length, () => titulosToCSV(titulos), `titulos-${stamp()}.csv`)}
          {item('Clientes', 'clientes', config.clientes.length, () => clientesToCSV(config.clientes), `clientes-${stamp()}.csv`)}
          {item('Proprietários', 'proprietarios', config.proprietarios.length, () => proprietariosToCSV(config.proprietarios), `proprietarios-${stamp()}.csv`)}
          {item('Funcionários', 'funcionarios', config.funcionarios.length, () => funcionariosToCSV(config.funcionarios), `funcionarios-${stamp()}.csv`)}
          {item('Chaves PIX', 'pix', config.chavesPix.length, () => pixToCSV(config.chavesPix), `pix-${stamp()}.csv`)}
          {item('Configurações Gerais', 'config', 1, () => configGeralToCSV(config), `config-${stamp()}.csv`)}
        </div>

        <p className="text-[10px] text-muted-foreground pt-1">
          ⚠️ A importação <strong>substitui</strong> os dados existentes da seção correspondente.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFile}
        />
      </CardContent>
    </Card>
  );
}
