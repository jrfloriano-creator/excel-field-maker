import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileText, Printer } from 'lucide-react';
import { LogEntry } from '@/types/titulo';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  logs: LogEntry[];
}

function fmt(d: string) {
  return new Date(d).toLocaleString('pt-BR');
}

export function LogPanel({ logs }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [ini, setIni] = useState('');
  const [fim, setFim] = useState(today);

  const filtrados = useMemo(() => {
    return logs.filter(l => {
      const d = l.data.slice(0, 10);
      if (ini && d < ini) return false;
      if (fim && d > fim) return false;
      return true;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [logs, ini, fim]);

  const exportPDF = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Relatório de LOG do Sistema', 14, 16);
    pdf.setFontSize(9);
    pdf.text(`Período: ${ini || '—'} a ${fim || '—'} | Registros: ${filtrados.length}`, 14, 22);
    autoTable(pdf, {
      startY: 28,
      head: [['Data/Hora', 'Usuário', 'Tipo', 'Descrição']],
      body: filtrados.map(l => [fmt(l.data), l.usuario, l.tipo, l.descricao]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 10, right: 10 },
    });
    pdf.save(`log-${today}.pdf`);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">📑 LOG do Sistema</CardTitle>
        <p className="text-xs text-muted-foreground">Filtre por período e gere PDF.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Início</Label>
            <Input type="date" value={ini} onChange={e => setIni(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input type="date" value={fim} onChange={e => setFim(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{filtrados.length} registro(s) no período.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={exportPDF}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1 text-xs">
          {filtrados.slice(0, 200).map(l => (
            <div key={l.id} className="border rounded p-2">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{fmt(l.data)}</span>
                <span>{l.usuario}</span>
              </div>
              <p><strong>{l.tipo}</strong> — {l.descricao}</p>
            </div>
          ))}
          {filtrados.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Sem registros</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
