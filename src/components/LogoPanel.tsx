import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  logo?: string;
  onUpdate: (logo?: string) => void;
}

const MAX_W = 256;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const ratio = Math.min(1, MAX_W / img.width);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function LogoPanel({ logo, onUpdate }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await resizeImage(file);
      onUpdate(data);
      toast.success('Logo atualizado');
    } catch {
      toast.error('Falha ao carregar imagem');
    } finally {
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🏢 Logo da Empresa</CardTitle>
        <p className="text-xs text-muted-foreground">Aparece no topo do sistema e no login.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {logo && (
          <div className="flex items-center gap-2 p-2 border rounded">
            <img src={logo} alt="Logo" className="h-12 object-contain bg-white p-1 rounded" />
            <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => onUpdate(undefined)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Button variant="outline" className="w-full" onClick={() => ref.current?.click()}>
          <Upload className="h-4 w-4 mr-1" /> {logo ? 'Trocar Logo' : 'Carregar Logo'}
        </Button>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </CardContent>
    </Card>
  );
}
